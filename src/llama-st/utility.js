const cacheName = "llama-cpp-wasm-cache";
const dbName = "llama-cpp-models";
const storeName = "models";
const LOG_PREFIX = "[llama-worker:loader]";
const log = (...args) => console.info(LOG_PREFIX, ...args);
const debug = (...args) => console.debug(LOG_PREFIX, ...args);
const warn = (...args) => console.warn(LOG_PREFIX, ...args);
const error = (...args) => console.error(LOG_PREFIX, ...args);

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(storeName);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getFromDB(db, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const g = store.get(key);
        g.onsuccess = () => resolve(g.result);
        g.onerror = () => reject(g.error);
    });
}

async function saveToDB(db, key, buffer) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const p = store.put(buffer, key);
        p.onsuccess = () => resolve();
        p.onerror = () => reject(p.error);
    });
}

export async function loadBinaryResource(url, callback) {
    let cache = null;

    if (!self.cachedModels) {
        self.cachedModels = {};
    }

    if (self.cachedModels[url]) {
        debug("Returning model from in-memory cache", { url, byteLength: self.cachedModels[url]?.length });
        callback(self.cachedModels[url]);
        return;
    }

    let db;
    if (self.indexedDB) {
        try {
            debug("Opening IndexedDB for model", { url });
            db = await openDB();
            const stored = await getFromDB(db, url);
            if (stored) {
                const byteArray = new Uint8Array(stored);
                log("Model fetched from IndexedDB", { url, byteLength: byteArray.length });
                self.cachedModels[url] = byteArray;
                callback(byteArray);
                return;
            }
        } catch (e) {
            error("IndexedDB load error", e);
        }
    }

    if (self.caches) {
        debug("Checking Cache Storage for model", { url });
        cache = await self.caches.open(cacheName);
        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
            const data = await cachedResponse.arrayBuffer();
            const byteArray = new Uint8Array(data);
            log("Model fetched from Cache Storage", { url, byteLength: byteArray.length });
            self.cachedModels[url] = byteArray;

            if (db) {
                saveToDB(db, url, data).catch((err) => warn("Failed to persist cached model to IndexedDB", err));
            }

            callback(byteArray);
            return;
        }
    }

    // Download model and store in cache
    log("Requesting model from network", { url });
    const req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.responseType = "arraybuffer";

    req.onload = async () => {
        debug("Network request completed", { url, status: req.status });
        if (req.status >= 400) {
            warn("Network request returned error status", { url, status: req.status });
            return;
        }
        const arrayBuffer = req.response;
        if (arrayBuffer) {
            const byteArray = new Uint8Array(arrayBuffer);

            if (cache) {
                try {
                    await cache.put(url, new Response(arrayBuffer));
                    debug("Stored model in Cache Storage", { url });
                } catch (err) {
                    warn("Failed to store model in Cache Storage", { url, err });
                }
            }
            if (db) {
                saveToDB(db, url, arrayBuffer).catch((err) => warn("Failed to store model in IndexedDB", err));
            }

            self.cachedModels[url] = byteArray;
            log("Model downloaded from network", { url, byteLength: byteArray.length });
            callback(byteArray);
        }
    };

    req.onerror = (event) => {
        error("Network error while fetching model", { url, event });
    };

    req.send(null);
}
