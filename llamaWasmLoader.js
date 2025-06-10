// src/llamaWasmLoader.js
import { LlamaCpp } from "./src/llama-st/llama.js";

let app = null;

/**
 * Initialize the Wasm LLM.
 * @param {() => void} onLoad    Called when the model is ready
 * @param {(chunk: string) => void} onChunk  Called for each text chunk
 * @param {() => void} onComplete Called when generation finishes
 */
export function createLlama(onLoad, onChunk, onComplete) {
  if (app) {
    // Already created
    return app;
  }

  const modelUrl = "/models/qwen-0.6b/Qwen3-0.6B-Q8_0.gguf";

  app = new LlamaCpp(
    modelUrl,
    () => {
      console.log("Model loaded");
      onLoad();
    },
    (text) => onChunk(text),
    () => {
      console.log("Generation complete");
      onComplete();
    }
  );

  return app;
}
