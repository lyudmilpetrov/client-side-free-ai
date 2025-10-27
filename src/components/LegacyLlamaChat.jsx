import { useMemo, useRef, useState } from "react";
import { LlamaCpp } from "../llama-st/llama.js";

const MODELS = [
  {
    url: "https://huggingface.co/afrideva/TinyMistral-248M-SFT-v4-GGUF/resolve/main/tinymistral-248m-sft-v4.q8_0.gguf",
    label: "TinyMistral-248M SFT v4 • q8_0 (265 MB)",
  },
  {
    url: "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    label: "TinyLlama 1.1B Chat • Q4_K_M (669 MB)",
  },
  {
    url: "https://huggingface.co/TKDKid1000/phi-1_5-GGUF/resolve/main/phi-1_5-Q4_K_M.gguf",
    label: "Phi 1.5 • Q4_K_M (918 MB)",
  },
  {
    url: "https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat-GGUF/resolve/main/qwen1_5-1_8b-chat-q3_k_m.gguf",
    label: "Qwen 1.5 1.8B Chat • Q3_K_M (1.02 GB)",
  },
  {
    url: "https://huggingface.co/stabilityai/stablelm-2-zephyr-1_6b/resolve/main/stablelm-2-zephyr-1_6b-Q4_1.gguf",
    label: "StableLM 2 Zephyr 1.6B • Q4_1 (1.07 GB)",
  },
  {
    url: "https://huggingface.co/Menlo/Jan-nano-gguf/resolve/main/jan-nano-4b-Q3_K_S.gguf",
    label: "Jan Nano 4B • Q3_K_S (1.08 GB)",
  },
  {
    url: "https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q3_K_M.gguf",
    label: "Phi-2 • Q3_K_M (1.48 GB)",
  },
  {
    url: "https://huggingface.co/mradermacher/Qwen3-8B-Josiefied-iSMART-GGUF/resolve/main/Qwen3-8B-Josiefied-iSMART.Q2_K.gguf",
    label: "Qwen3 8B Josiefied iSMART • Q2_K (3.28 GB)",
  },
];

const DEFAULT_PROMPT = "Describe some of the business applications of Generative AI.";

const STATUS_VARIANTS = {
  idle: { text: "Model not loaded", variant: "idle" },
  loading: { text: "Loading selected model", variant: "loading" },
  loaded: { text: "Model ready in memory", variant: "ready" },
  generating: { text: "Generating tokens", variant: "loading" },
};

export function LegacyLlamaChat() {
  const llamaRef = useRef(null);
  const [modelUrl, setModelUrl] = useState(MODELS[0].url);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("idle");
  const [loadedModelUrl, setLoadedModelUrl] = useState(null);

  const isSelectedModelLoaded = loadedModelUrl === modelUrl;
  const indicator = useMemo(() => {
    if (status === "loading") return STATUS_VARIANTS.loading;
    if (status === "generating") return STATUS_VARIANTS.generating;
    if (isSelectedModelLoaded) return STATUS_VARIANTS.loaded;
    return STATUS_VARIANTS.idle;
  }, [status, isSelectedModelLoaded]);

  const handleModelChange = (event) => {
    const nextModelUrl = event.target.value;
    setModelUrl(nextModelUrl);
    if (llamaRef.current && llamaRef.current.url === nextModelUrl) {
      setLoadedModelUrl(nextModelUrl);
      setStatus("loaded");
    } else {
      setLoadedModelUrl(null);
      setStatus("idle");
    }
  };

  const runModel = () => {
    const execute = () => {
      llamaRef.current.run({
        prompt,
        ctx_size: 2048,
        temp: 0.8,
        top_k: 40,
        no_display_prompt: true,
      });
    };

    if (!llamaRef.current || llamaRef.current.url !== modelUrl) {
      setLoadedModelUrl(null);
      llamaRef.current = new LlamaCpp(
        modelUrl,
        () => {
          setStatus("loaded");
          setLoadedModelUrl(modelUrl);
          execute();
        },
        (text) => {
          setStatus("generating");
          setResult((prev) => prev + text);
        },
        () => setStatus("idle")
      );
    } else {
      setStatus("loaded");
      setLoadedModelUrl(modelUrl);
      execute();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    setResult("");
    setStatus("loading");
    runModel();
  };

  return (
    <section className="panel" aria-labelledby="legacy-chat-heading">
      <div className="panel-header">
        <h2 id="legacy-chat-heading" className="panel-title">
          llama.cpp streaming demo
        </h2>
        <span className={`status-chip ${indicator.variant}`}>{indicator.text}</span>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="field-label" htmlFor="legacy-model">
            Model
          </label>
          <select
            id="legacy-model"
            value={modelUrl}
            onChange={handleModelChange}
            className="select-field"
          >
            {MODELS.map((model) => (
              <option key={model.url} value={model.url}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="field-label" htmlFor="legacy-prompt">
            Prompt
          </label>
          <textarea
            id="legacy-prompt"
            className="textarea-field"
            rows={5}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </div>

        <div className="button-row">
          <button type="submit" className="btn btn-primary" disabled={status === "loading"}>
            Run model
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setPrompt(DEFAULT_PROMPT);
              setResult("");
            }}
          >
            Reset
          </button>
        </div>

        {status === "loading" && (
          <div className="progress-track" aria-hidden="true">
            <div className="progress-bar" style={{ width: "65%" }} />
          </div>
        )}
      </form>

      <div>
        <span className="field-label">Result</span>
        <pre className="output-box" aria-live="polite">
          {result || "Output will appear here once generation begins."}
        </pre>
      </div>

      <div className="readout" aria-live="polite">
        {status === "loading" && "Loading model into memory..."}
        {status === "loaded" && "Model loaded. Ready for generation."}
        {status === "generating" && "Streaming tokens..."}
        {status === "idle" && !isSelectedModelLoaded && "Select a model to begin."}
      </div>
    </section>
  );
}
