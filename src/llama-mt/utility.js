const cacheName = "llama-cpp-wasm-cache";
const dbName = "llama-cpp-models";
const storeName = "models";

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
        callback(self.cachedModels[url]);
        return;
    }

    let db;
    if (self.indexedDB) {
        try {
            db = await openDB();
            const stored = await getFromDB(db, url);
            if (stored) {
                const byteArray = new Uint8Array(stored);
                self.cachedModels[url] = byteArray;
                callback(byteArray);
                return;
            }
        } catch (e) {
            console.error("IndexedDB load error", e);
        }
    }

    if (self.caches) {
        cache = await self.caches.open(cacheName);
        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
            const data = await cachedResponse.arrayBuffer();
            const byteArray = new Uint8Array(data);
            self.cachedModels[url] = byteArray;

            if (db) {
                saveToDB(db, url, data).catch(() => {});
            }

            callback(byteArray);
            return;
        }
    }

    // Download model and store in cache
    const req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.responseType = "arraybuffer";

    req.onload = async () => {
        const arrayBuffer = req.response;
        if (arrayBuffer) {
            const byteArray = new Uint8Array(arrayBuffer);

            if (cache) {
                await cache.put(url, new Response(arrayBuffer));
            }
            if (db) {
                saveToDB(db, url, arrayBuffer).catch(() => {});
            }

            self.cachedModels[url] = byteArray;
            callback(byteArray);
        }
    };

    req.send(null);
}
