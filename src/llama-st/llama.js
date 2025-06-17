import { action } from "./actions.js";

class LlamaCpp {
  // callback have to be defined before load_worker
  constructor(url, init_callback, write_result_callback, on_complete_callback) {
    this.url = url;
    this.init_callback = init_callback;
    this.write_result_callback = write_result_callback;
    this.on_complete_callback = on_complete_callback;
    this.loadWorker();
  }

  loadWorker() {
    if (!globalThis.__llamaWorkerCache) {
      globalThis.__llamaWorkerCache = {};
    }

    const cached = globalThis.__llamaWorkerCache[this.url];
    if (cached) {
      this.worker = cached.worker;
      cached.listeners.add(this);
      this.attachHandler(cached);
      if (cached.initialized && this.init_callback) {
        // ensure async callback so event handlers are attached
        Promise.resolve().then(() => this.init_callback());
      }
      return;
    }

    const worker = new Worker(new URL("./main-worker.js", import.meta.url), {
      type: "module",
    });
    this.worker = worker;
    globalThis.__llamaWorkerCache[this.url] = {
      worker,
      initialized: false,
      listeners: new Set([this]),
    };
    this.attachHandler(globalThis.__llamaWorkerCache[this.url]);

    this.worker.postMessage({
      event: action.LOAD,
      url: this.url,
    });
  }

  attachHandler(cacheEntry) {
    const handler = (event) => {
      switch (event.data.event) {
        case action.INITIALIZED:
          cacheEntry.initialized = true;
          if (this.init_callback) {
            this.init_callback();
          }
          break;
        case action.WRITE_RESULT:
          if (this.write_result_callback) {
            this.write_result_callback(event.data.text);
          }
          break;
        case action.RUN_COMPLETED:
          if (this.on_complete_callback) {
            this.on_complete_callback();
          }
          break;
      }
    };

    cacheEntry.worker.addEventListener("message", handler);
    this._handler = handler;
  }

  run({
    prompt,
    chatml = false,
    n_predict = -2,
    ctx_size = 2048,
    batch_size = 512,
    temp = 0.8,
    n_gpu_layers = navigator?.gpu?.wgslLanguageFeatures?.size ?? 0, // Use GPU if available, otherwise CPU
    top_k = 40,
    top_p = 0.9,
    no_display_prompt = true,
  } = {}) {
    this.worker.postMessage({
      event: action.RUN_MAIN,
      prompt,
      chatml,
      n_predict,
      ctx_size,
      batch_size,
      temp,
      n_gpu_layers,
      top_k,
      top_p,
      no_display_prompt,
    });
  }

  dispose() {
    if (this.worker && this._handler) {
      this.worker.removeEventListener("message", this._handler);
      const cache = globalThis.__llamaWorkerCache?.[this.url];
      if (cache) {
        cache.listeners.delete(this);
      }
    }
  }
}

export { LlamaCpp };
