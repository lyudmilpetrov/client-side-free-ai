import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as webllm from "@mlc-ai/web-llm";
import { pipeline } from "@xenova/transformers";

const PREFERRED_MODEL_IDS = [
  "Qwen2-1.5B-Instruct-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
];

const MODEL_LABELS = {
  "Qwen2-1.5B-Instruct-q4f16_1-MLC": "Qwen2 1.5B Instruct • q4f16_1",
  "Llama-3.2-1B-Instruct-q4f32_1-MLC": "Llama 3.2 1B Instruct • q4f32_1",
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC": "Qwen2.5 0.5B Instruct • q4f16_1",
};

const FALLBACK_MODEL_ID = "Xenova/distilgpt2";
const EMBEDDING_MODEL_ID = "Xenova/all-MiniLM-L6-v2";

function createAppConfig() {
  const config = JSON.parse(JSON.stringify(webllm.prebuiltAppConfig));
  config.useIndexedDBCache = true;
  config.model_list = config.model_list.filter((entry) =>
    PREFERRED_MODEL_IDS.includes(entry.model_id)
  );
  return config;
}

function useServiceWorkerMessenger() {
  return useCallback(async (message) => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage(message);
    } catch (error) {
      console.warn("Service worker not ready", error);
    }
  }, []);
}

function formatVector(values) {
  if (!values || values.length === 0) return "";
  const take = values.slice(0, 128);
  const formatted = take.map((value) => value.toFixed(4));
  if (values.length > 128) {
    formatted.push("…");
  }
  return formatted.join(", ");
}

export function PwaChatWindow() {
  const isWebGPUAvailable = typeof navigator !== "undefined" && navigator.gpu != null;
  const [selectedModelId, setSelectedModelId] = useState(PREFERRED_MODEL_IDS[0]);
  const [engineStatus, setEngineStatus] = useState(isWebGPUAvailable ? "idle" : "fallback");
  const [progress, setProgress] = useState({ text: "Model cache not loaded", percent: 0 });
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [embeddingVector, setEmbeddingVector] = useState([]);
  const [embeddingStatus, setEmbeddingStatus] = useState("idle");
  const [embeddingError, setEmbeddingError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const chatLogRef = useRef(null);
  const engineRef = useRef(null);
  const fallbackPipelineRef = useRef(null);
  const embeddingPipelineRef = useRef(null);
  const [appConfig] = useState(() => createAppConfig());
  const sendToServiceWorker = useServiceWorkerMessenger();

  const modelOptions = useMemo(() => {
    const list = webllm.prebuiltAppConfig.model_list || [];
    return PREFERRED_MODEL_IDS.map((id) => {
      const record = list.find((entry) => entry.model_id === id);
      if (!record) return null;
      return {
        id,
        label: MODEL_LABELS[id] ?? id,
        record,
      };
    }).filter(Boolean);
  }, []);

  useEffect(() => {
    if (!modelOptions.some((option) => option.id === selectedModelId) && modelOptions.length) {
      setSelectedModelId(modelOptions[0].id);
    }
  }, [modelOptions, selectedModelId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedModelId) return;
      if (typeof webllm.hasModelInCache !== "function") {
        return;
      }
      try {
        const cached = await webllm.hasModelInCache(selectedModelId, appConfig);
        if (!cancelled) {
          setIsCached(Boolean(cached));
        }
      } catch {
        if (!cancelled) {
          setIsCached(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedModelId, appConfig]);

  useEffect(() => {
    if (!chatLogRef.current) return;
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (engineRef.current && typeof engineRef.current.unload === "function") {
        engineRef.current.unload();
      }
    };
  }, []);

  const loadFallbackPipeline = useCallback(async () => {
    if (fallbackPipelineRef.current) {
      return fallbackPipelineRef.current;
    }
    setEngineStatus("loading");
    setProgress({ text: "Downloading CPU fallback model", percent: 5 });
    const generator = await pipeline("text-generation", FALLBACK_MODEL_ID, {
      progress_callback: (progressEvent) => {
        if (!progressEvent) return;
        const percent = Math.min(99, Math.round((progressEvent.progress ?? 0) * 100));
        setProgress({
          text: `CPU model download ${percent}%`,
          percent,
        });
      },
    });
    fallbackPipelineRef.current = generator;
    setProgress({ text: "CPU fallback ready", percent: 100 });
    setEngineStatus("ready");
    return generator;
  }, []);

  const handlePrefetch = useCallback(async () => {
    const selected = modelOptions.find((option) => option.id === selectedModelId);
    if (!selected) return;
    setPrefetching(true);
    await sendToServiceWorker({
      type: "download-model",
      payload: {
        baseUrl: selected.record.model,
        modelLib: selected.record.model_lib,
      },
    });
    setPrefetching(false);
    setProgress((prev) => ({
      ...prev,
      text: "Prefetch requested – service worker will continue in the background.",
    }));
  }, [modelOptions, selectedModelId, sendToServiceWorker]);

  const handleClearCache = useCallback(async () => {
    try {
      if (typeof webllm.deleteModelAllInfoInCache === "function") {
        await webllm.deleteModelAllInfoInCache(selectedModelId, appConfig);
      }
      setIsCached(false);
      setProgress({ text: "Cache cleared", percent: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [selectedModelId, appConfig]);

  const handleLoadModel = useCallback(async () => {
    setError(null);
    setProgress({ text: "Preparing model", percent: 5 });
    if (!isWebGPUAvailable) {
      await loadFallbackPipeline();
      return;
    }
    const selected = modelOptions.find((option) => option.id === selectedModelId);
    if (!selected) {
      setError("Selected model is not available in the current build.");
      return;
    }
    try {
      if (engineRef.current && typeof engineRef.current.unload === "function") {
        await engineRef.current.unload();
      }
    } catch (err) {
      console.warn("Error unloading previous model", err);
    }
    setEngineStatus("loading");
    try {
      const engine = await webllm.CreateMLCEngine(selectedModelId, {
        appConfig,
        initProgressCallback: (info) => {
          if (!info) return;
          const percent = info.progress !== undefined ? Math.round(info.progress * 100) : undefined;
          setProgress({
            text: info.text ?? "Fetching model artifacts",
            percent: percent ?? 0,
          });
        },
      });
      engineRef.current = engine;
      setEngineStatus("ready");
      setProgress({ text: "WebGPU model ready", percent: 100 });
      setIsCached(true);
      await sendToServiceWorker({
        type: "download-model",
        payload: {
          baseUrl: selected.record.model,
          modelLib: selected.record.model_lib,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setEngineStatus("error");
      setProgress({ text: "Model load failed", percent: 0 });
    }
  }, [appConfig, isWebGPUAvailable, loadFallbackPipeline, modelOptions, selectedModelId, sendToServiceWorker]);

  const handleSend = useCallback(async (event) => {
    event.preventDefault();
    const content = input.trim();
    if (!content) return;
    setEmbeddingVector([]);
    setEmbeddingStatus("idle");
    const userMessage = { role: "user", content };
    const history = [...messages, userMessage];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setEngineStatus("generating");
    setProgress({ text: "Generating response", percent: 90 });
    try {
      if (engineRef.current) {
        const stream = await engineRef.current.chat.completions.create({
          model: selectedModelId,
          messages: history,
          stream: true,
        });
        let generated = "";
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            generated += delta;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: "assistant", content: generated };
              return next;
            });
          }
        }
        setEngineStatus("ready");
        setProgress({ text: "Response ready", percent: 100 });
        return;
      }
      const generator = await loadFallbackPipeline();
      const output = await generator(content, {
        max_new_tokens: 160,
        do_sample: true,
        temperature: 0.8,
      });
      const text = Array.isArray(output)
        ? output[0]?.generated_text ?? ""
        : output?.generated_text ?? "";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: text.trim() };
        return next;
      });
      setEngineStatus("ready");
      setProgress({ text: "Response ready", percent: 100 });
    } catch (err) {
      setMessages((prev) => prev.slice(0, Math.max(0, prev.length - 1)));
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setEngineStatus("error");
      setProgress({ text: "Generation failed", percent: 0 });
    }
  }, [input, messages, loadFallbackPipeline, selectedModelId]);

  const handleEmbedding = useCallback(async () => {
    const targetMessage = [...messages].reverse().find((item) => item.role === "assistant") ?? messages[messages.length - 1];
    const source = targetMessage?.content || input.trim();
    if (!source) {
      setEmbeddingError("Provide a prompt or wait for a response before computing embeddings.");
      return;
    }
    setEmbeddingStatus("loading");
    setEmbeddingError(null);
    try {
      if (engineRef.current?.embeddings) {
        const response = await engineRef.current.embeddings.create({
          model: selectedModelId,
          input: source,
        });
        const vector = Array.isArray(response?.data)
          ? response.data[0]?.embedding ?? []
          : [];
        setEmbeddingVector(vector);
        setEmbeddingStatus("ready");
        return;
      }
    } catch (err) {
      console.warn("WebGPU embeddings unavailable", err);
    }
    try {
      if (!embeddingPipelineRef.current) {
        embeddingPipelineRef.current = await pipeline("feature-extraction", EMBEDDING_MODEL_ID, {
          progress_callback: (progressEvent) => {
            if (!progressEvent) return;
            const percent = Math.min(99, Math.round((progressEvent.progress ?? 0) * 100));
            setProgress({ text: `Embedding model download ${percent}%`, percent });
          },
        });
      }
      const embeddings = await embeddingPipelineRef.current(source, {
        pooling: "mean",
        normalize: true,
      });
      const vector = Array.from(embeddings.data ?? []);
      setEmbeddingVector(vector);
      setEmbeddingStatus("ready");
      setProgress({ text: "Embedding ready", percent: 100 });
    } catch (err) {
      setEmbeddingError(err instanceof Error ? err.message : String(err));
      setEmbeddingStatus("error");
    }
  }, [input, messages, selectedModelId]);

  const statusChip = useMemo(() => {
    if (engineStatus === "loading") return { variant: "loading", text: "Loading model" };
    if (engineStatus === "generating") return { variant: "loading", text: "Generating" };
    if (engineStatus === "ready") return { variant: "ready", text: "Ready" };
    if (engineStatus === "error") return { variant: "error", text: "Error" };
    if (engineStatus === "fallback") return { variant: "warn", text: "CPU fallback" };
    return { variant: "idle", text: "Waiting" };
  }, [engineStatus]);

  const capabilityBadge = isWebGPUAvailable ? "WebGPU detected" : "WebGPU unavailable – using WASM runtime";

  return (
    <section className="panel" aria-labelledby="pwa-chat-heading">
      <div className="panel-header">
        <h2 id="pwa-chat-heading" className="panel-title">
          Offline-ready WebGPU chat
        </h2>
        <span className={`status-chip ${statusChip.variant}`}>{statusChip.text}</span>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="field-label" htmlFor="pwa-model">
            WebLLM model
          </label>
          <select
            id="pwa-model"
            className="select-field"
            value={selectedModelId}
            onChange={(event) => setSelectedModelId(event.target.value)}
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="helper-text">
            Models are cached with a service worker + IndexedDB so that WebGPU sessions can resume offline without re-downloading shards.
          </p>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleLoadModel}
            disabled={engineStatus === "loading"}
          >
            {isWebGPUAvailable ? "Load on WebGPU" : "Init CPU fallback"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handlePrefetch}
            disabled={engineStatus === "loading" || prefetching}
          >
            {prefetching ? "Caching…" : "Cache offline"}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleClearCache}>
            Clear cache
          </button>
        </div>

        <div className="readout">
          <div>{progress.text}</div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }} />
          </div>
        </div>

        <div className="button-row">
          <span className="badge info">{capabilityBadge}</span>
          <span className={`badge ${isCached ? "success" : "warn"}`}>
            {isCached ? "Cached for offline use" : "Cache not populated yet"}
          </span>
        </div>

        {error && (
          <div className="badge error" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="chat-window">
        <div className="chat-log" ref={chatLogRef} aria-live="polite">
          {messages.length === 0 && (
            <p className="helper-text">
              Start a conversation once the model is ready. Responses stream into the assistant bubble in real time.
            </p>
          )}
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
              <div className="chat-meta">
                <span>{message.role === "user" ? "You" : "Assistant"}</span>
                <span>{index + 1}</span>
              </div>
              <div className="bubble">{message.content}</div>
            </div>
          ))}
        </div>

        <form className="two-column" onSubmit={handleSend}>
          <textarea
            className="textarea-field"
            rows={3}
            placeholder="Ask something…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="button-row">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                engineStatus === "loading" ||
                engineStatus === "error" ||
                (isWebGPUAvailable && !engineRef.current)
              }
            >
              Send
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleEmbedding}
              disabled={messages.length === 0 && !input.trim()}
            >
              Embed last reply
            </button>
          </div>
        </form>
      </div>

      <div>
        <div className="badge info">Embeddings</div>
        {embeddingStatus === "idle" && (
          <p className="helper-text">Use "Embed last reply" to produce MiniLM/E5 embeddings for the latest assistant message.</p>
        )}
        {embeddingStatus === "loading" && <p className="helper-text">Computing embedding vector…</p>}
        {embeddingStatus === "error" && embeddingError && (
          <div className="badge error" role="alert">
            {embeddingError}
          </div>
        )}
        {embeddingStatus === "ready" && embeddingVector.length > 0 && (
          <>
            <p className="helper-text">
              Showing first {Math.min(embeddingVector.length, 128)} dimensions ({embeddingVector.length} total).
            </p>
            <div className="embed-output">{formatVector(embeddingVector)}</div>
          </>
        )}
      </div>

      <div className="model-list">
        <strong>How it works</strong>
        <span>• Service worker stores shards with chunked Range requests + IndexedDB for offline replay.</span>
        <span>• Integrity hashes (SHA-256) are verified before responding to any shard request.</span>
        <span>• WebGPU runs WebLLM models; WASM (Transformers.js) keeps a CPU fallback available.</span>
      </div>
    </section>
  );
}
