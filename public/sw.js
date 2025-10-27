const APP_CACHE = "app-shell-v1";
const MODEL_CACHE = "model-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/vite.svg",
];
const MODEL_URL_PATTERNS = [
  "https://huggingface.co/",
  "https://cdn-lfs.huggingface.co/",
  "https://raw.githubusercontent.com/mlc-ai/",
  "https://cdn.jsdelivr.net/",
  "https://models.xenova.ai/",
];
const CHUNK_SIZE = 1 << 20; // 1 MiB
const DB_NAME = "pwa-model-cache";
const DATA_STORE = "shards";
const META_STORE = "metadata";
const verifiedInMemory = new Map();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== APP_CACHE && key !== MODEL_CACHE)
          .map((key) => caches.delete(key))
      );
      await ensureDB();
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (shouldHandleModel(url)) {
    event.respondWith(handleModelRequest(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data.type === "download-model" && data.payload) {
    event.waitUntil(prefetchModelAssets(data.payload));
  }
  if (data.type === "clear-model-cache" && data.payload?.urls) {
    event.waitUntil(
      Promise.all(
        data.payload.urls.map((url) => deleteShard(url))
      )
    );
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

function shouldHandleModel(url) {
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    return true;
  }
  return MODEL_URL_PATTERNS.some((pattern) => url.href.startsWith(pattern));
}

async function handleModelRequest(request) {
  try {
    const canonical = stripQuery(request.url);
    const rangeHeader = request.headers.get("range");
    const stored = await getShard(canonical);
    if (stored && stored.metadata?.complete) {
      const buffer = stored.buffer;
      const metadata = stored.metadata;
      const valid = await verifyIntegrity(canonical, buffer, metadata);
      if (!valid) {
        await deleteShard(canonical);
      } else {
        return createResponse(buffer, metadata, rangeHeader, request);
      }
    }
    const partial = stored && stored.buffer && !stored.metadata?.complete ? stored.buffer : undefined;
    const resumeTotal = stored?.metadata?.total || undefined;
    const download = await downloadWithResume(request, canonical, partial, resumeTotal);
    await putShard(canonical, download.buffer, {
      total: download.total,
      hash: download.hash,
      complete: true,
      verifiedAt: Date.now(),
    });
    return createResponse(download.buffer, { total: download.total, hash: download.hash }, rangeHeader, request);
  } catch (error) {
    console.error("[sw] Falling back to network due to", error);
    return fetch(request);
  }
}

async function downloadWithResume(request, canonical, existingBuffer, existingTotal) {
  const controller = new AbortController();
  const signal = controller.signal;
  const requestInit = {
    mode: request.mode,
    credentials: request.credentials,
    cache: "no-store",
    redirect: "follow",
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal,
  };
  let collected = existingBuffer ? new Uint8Array(existingBuffer) : new Uint8Array(0);
  let total = existingTotal ?? null;
  let start = collected.byteLength;
  const headers = new Headers(request.headers);
  headers.delete("range");
  while (total == null || start < total) {
    const end = start + CHUNK_SIZE - 1;
    const chunkHeaders = new Headers(headers);
    chunkHeaders.set("range", `bytes=${start}-${end}`);
    const chunkRequest = new Request(request.url, Object.assign({}, requestInit, { headers: chunkHeaders }));
    const response = await fetch(chunkRequest);
    if (!(response.status === 206 || response.status === 200)) {
      throw new Error(`Unexpected status ${response.status} for ${canonical}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    let chunk = new Uint8Array(arrayBuffer);
    if (response.status === 200) {
      if (start > 0) {
        const fullRequest = new Request(request.url, Object.assign({}, requestInit, { headers }));
        const fullResponse = await fetch(fullRequest);
        if (!fullResponse.ok) {
          throw new Error(`Unexpected status ${fullResponse.status} for ${canonical}`);
        }
        const fullBuffer = await fullResponse.arrayBuffer();
        collected = new Uint8Array(fullBuffer);
      } else {
        const merged = new Uint8Array(collected.byteLength + chunk.byteLength);
        merged.set(collected);
        merged.set(chunk, collected.byteLength);
        collected = merged;
      }
      total = collected.byteLength;
      break;
    }
    if (!total) {
      total = parseContentRange(response.headers.get("content-range")) ?? start + chunk.byteLength;
    }
    const merged = new Uint8Array(collected.byteLength + chunk.byteLength);
    merged.set(collected);
    merged.set(chunk, collected.byteLength);
    collected = merged;
    start += chunk.byteLength;
    await putShard(canonical, collected.buffer, {
      total: total ?? collected.byteLength,
      complete: false,
      hash: null,
      verifiedAt: 0,
    });
    if (chunk.byteLength < CHUNK_SIZE) {
      total = collected.byteLength;
      break;
    }
    if (total && start >= total) {
      break;
    }
  }
  const buffer = collected.buffer.slice(0);
  const hash = await digest(buffer);
  await caches
    .open(MODEL_CACHE)
    .then((cache) => cache.put(canonical, new Response(buffer.slice(0), createResponseHeaders(total ?? collected.byteLength, hash))));
  return { buffer, total: total ?? collected.byteLength, hash };
}

function parseContentRange(rangeHeader) {
  if (!rangeHeader) return null;
  const match = /bytes \d+-\d+\/(\d+)/.exec(rangeHeader);
  if (!match) return null;
  return Number(match[1]);
}

function createResponse(buffer, metadata, rangeHeader, request) {
  const total = metadata.total ?? buffer.byteLength;
  const headers = createResponseHeaders(total, metadata.hash);
  if (!rangeHeader) {
    return new Response(buffer.slice(0), { status: 200, headers });
  }
  const rangeMatch = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!rangeMatch) {
    return new Response(buffer.slice(0), { status: 200, headers });
  }
  const start = Number(rangeMatch[1]);
  let end = rangeMatch[2] ? Number(rangeMatch[2]) : total - 1;
  end = Math.min(end, total - 1);
  if (start >= total || start > end) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${total}`,
      },
    });
  }
  const sliced = buffer.slice(start, end + 1);
  const rangeHeaders = new Headers(headers);
  rangeHeaders.set("Content-Range", `bytes ${start}-${end}/${total}`);
  rangeHeaders.set("Content-Length", String(sliced.byteLength));
  return new Response(sliced, { status: 206, headers: rangeHeaders });
}

function createResponseHeaders(total, hash) {
  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Length": String(total),
    "Accept-Ranges": "bytes",
  });
  if (hash) {
    headers.set("X-Content-Integrity", hash);
  }
  return headers;
}

async function prefetchModelAssets(payload) {
  const urls = new Set();
  if (Array.isArray(payload.urls)) {
    payload.urls.forEach((url) => urls.add(stripQuery(url)));
  }
  if (payload.baseUrl) {
    const base = normalizeModelBaseUrl(payload.baseUrl);
    if (base) {
      urls.add(new URL("mlc-chat-config.json", base).href);
      urls.add(new URL("tokenizer.json", base).href);
      urls.add(new URL("tokenizer.model", base).href);
      urls.add(new URL("tokenizer_config.json", base).href);
      urls.add(new URL("ndarray-cache.json", base).href);
    }
    try {
      if (!base) {
        throw new Error("Invalid base URL");
      }
      const configResponse = await fetch(new Request(new URL("ndarray-cache.json", base).href, { cache: "no-store" }));
      if (configResponse.ok) {
        const json = await configResponse.clone().json();
        if (Array.isArray(json.records)) {
          json.records.forEach((record) => {
            if (record.dataPath) {
              urls.add(new URL(record.dataPath, base).href);
            }
          });
        }
      }
    } catch (error) {
      console.warn("[sw] Unable to expand ndarray cache", error);
    }
  }
  if (payload.modelLib) {
    urls.add(payload.modelLib);
  }
  await Promise.all(Array.from(urls).map(async (url) => {
    const request = new Request(url, { method: "GET", cache: "no-store" });
    try {
      await handleModelRequest(request);
    } catch (error) {
      console.error("[sw] Prefetch error for", url, error);
    }
  }));
}

function normalizeModelBaseUrl(baseUrl) {
  try {
    const parsed = new URL(baseUrl, self.location.href);
    if (!parsed.pathname.endsWith("/")) {
      parsed.pathname += "/";
    }
    if (parsed.hostname === "huggingface.co" && !/\/resolve\/[^/]+\/$/.test(parsed.pathname)) {
      parsed.pathname += "resolve/main/";
    }
    return parsed.href;
  } catch (error) {
    console.warn("[sw] Unable to normalize model base URL", baseUrl, error);
    return null;
  }
}

async function ensureDB() {
  if (self.__modelDBPromise) {
    return self.__modelDBPromise;
  }
  self.__modelDBPromise = new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, 1);
    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error);
  });
  return self.__modelDBPromise;
}

async function getShard(key) {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DATA_STORE, META_STORE], "readonly");
    const dataStore = tx.objectStore(DATA_STORE);
    const metaStore = tx.objectStore(META_STORE);
    const dataRequest = dataStore.get(key);
    const metaRequest = metaStore.get(key);
    const result = {};
    dataRequest.onsuccess = () => {
      result.buffer = dataRequest.result || null;
    };
    metaRequest.onsuccess = () => {
      result.metadata = metaRequest.result || null;
    };
    tx.oncomplete = () => resolve(result.buffer ? result : null);
    tx.onerror = () => reject(tx.error);
  });
}

async function putShard(key, buffer, metadata) {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DATA_STORE, META_STORE], "readwrite");
    tx.objectStore(DATA_STORE).put(buffer, key);
    tx.objectStore(META_STORE).put(metadata, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteShard(key) {
  const db = await ensureDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DATA_STORE, META_STORE], "readwrite");
    tx.objectStore(DATA_STORE).delete(key);
    tx.objectStore(META_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function verifyIntegrity(key, buffer, metadata) {
  if (!metadata?.hash) {
    return false;
  }
  const cached = verifiedInMemory.get(key);
  if (cached && cached.hash === metadata.hash) {
    return true;
  }
  const hash = await digest(buffer);
  const valid = hash === metadata.hash;
  if (valid) {
    verifiedInMemory.set(key, { hash, at: Date.now() });
  }
  return valid;
}

async function digest(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stripQuery(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString();
}
