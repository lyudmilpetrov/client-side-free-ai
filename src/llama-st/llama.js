import { action } from "./actions.js";

const LOG_PREFIX = "[llama-client]";
const log = (...args) => console.info(LOG_PREFIX, ...args);
const debug = (...args) => console.debug(LOG_PREFIX, ...args);
const warn = (...args) => console.warn(LOG_PREFIX, ...args);

class LlamaCpp {
  // callback have to be defined before load_worker
  constructor(url, init_callback, write_result_callback, on_complete_callback) {
    log("Constructing LlamaCpp controller", { url });
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
      log("Reusing cached worker", { url: this.url, listenerCount: cached.listeners.size });
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
    log("Created new worker", { url: this.url });
    this.worker = worker;
    globalThis.__llamaWorkerCache[this.url] = {
      worker,
      initialized: false,
      listeners: new Set([this]),
    };
    this.attachHandler(globalThis.__llamaWorkerCache[this.url]);

    log("Posting LOAD message to worker", { url: this.url });
    this.worker.postMessage({
      event: action.LOAD,
      url: this.url,
    });
  }

  attachHandler(cacheEntry) {
    debug("Attaching message handler", { url: this.url });
    const handler = (event) => {
      debug("Received worker message", { url: this.url, event: event.data?.event });
      switch (event.data.event) {
        case action.INITIALIZED:
          log("Worker initialised", { url: this.url });
          cacheEntry.initialized = true;
          if (this.init_callback) {
            this.init_callback();
          }
          break;
        case action.WRITE_RESULT:
          debug("Worker produced output", { url: this.url, textLength: event.data.text?.length ?? 0 });
          if (this.write_result_callback) {
            this.write_result_callback(event.data.text);
          }
          break;
        case action.RUN_COMPLETED:
          log("Worker run completed", { url: this.url });
          if (this.on_complete_callback) {
            this.on_complete_callback();
          }
          break;
        default:
          warn("Worker emitted unknown event", { url: this.url, event: event.data });
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
    log("Dispatching RUN_MAIN", {
      url: this.url,
      promptLength: prompt?.length ?? 0,
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
      log("Disposing worker listener", { url: this.url });
      this.worker.removeEventListener("message", this._handler);
      const cache = globalThis.__llamaWorkerCache?.[this.url];
      if (cache) {
        cache.listeners.delete(this);
        debug("Listener removed from cache", { url: this.url, remainingListeners: cache.listeners.size });
      }
    }
  }
}

export { LlamaCpp };
