import React, { useRef, useState } from 'react';
import { LlamaCpp } from './llama-st/llama.js';

const MODELS = [
  {
    url: 'https://huggingface.co/afrideva/TinyMistral-248M-SFT-v4-GGUF/resolve/main/tinymistral-248m-sft-v4.q8_0.gguf',
    label: 'tinymistral-248m-sft-v4 q8_0 (265.26 MB)'
  },
  {
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    label: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0 Q4_K_M (669 MB)'
  },
  {
    url: 'https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat-GGUF/resolve/main/qwen1_5-1_8b-chat-q3_k_m.gguf',
    label: 'Qwen/Qwen1.5-1.8B-Chat Q3_K_M (1.02 GB)'
  },
  {
    url: 'https://huggingface.co/stabilityai/stablelm-2-zephyr-1_6b/resolve/main/stablelm-2-zephyr-1_6b-Q4_1.gguf',
    label: 'stabilityai/stablelm-2-zephyr-1_6b Q4_1 (1.07 GB)'
  },
  {
    url: 'https://huggingface.co/TKDKid1000/phi-1_5-GGUF/resolve/main/phi-1_5-Q4_K_M.gguf',
    label: 'microsoft/phi-1_5 Q4_K_M (918 MB)'
  },
  {
    url: 'https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q3_K_M.gguf',
    label: 'microsoft/phi-2 Q3_K_M (1.48 GB)'
  }
];

const DEFAULT_PROMPT =
  'Suppose Alice originally had 3 apples, then Bob gave Alice 7 apples, then Alice gave Cook 5 apples, and then Tim gave Alice 3x the amount of apples Alice had. How many apples does Alice have now? Let\u2019s think step by step.';

export default function App() {
  const [modelUrl, setModelUrl] = useState(MODELS[0].url);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('idle');
  const llamaRef = useRef(null);

  const runModel = () => {
    const run = () => {
      llamaRef.current.run({
        prompt,
        ctx_size: 2048,
        temp: 0.8,
        top_k: 40,
        no_display_prompt: true,
      });
    };

    if (!llamaRef.current || llamaRef.current.url !== modelUrl) {
      llamaRef.current = new LlamaCpp(
        modelUrl,
        () => {
          setStatus('loaded');
          run();
        },
        text => {
          setStatus('generating');
          setResult(r => r + text);
        },
        () => setStatus('idle')
      );
    } else {
      setStatus('loaded');
      run();
    }
  };

  const handleRun = e => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setResult('');
    setStatus('loading');
    runModel();
  };

  return (
    <main className="container" style={{ padding: '2rem' }}>
      <section>
        <h2>Demo</h2>

        <label>Model:</label>
        <select
          value={modelUrl}
          onChange={e => setModelUrl(e.target.value)}
          aria-label="Select model"
          required
        >
          {MODELS.map(m => (
            <option key={m.url} value={m.url}>{m.label}</option>
          ))}
        </select>

        <label>Prompt:</label>
        <textarea
          rows={5}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />

        <label>Result:</label>
        <pre>{result}</pre>
      </section>

      <section>
        <button onClick={handleRun} hidden={status !== 'idle'}>Run</button>
      </section>

      <section>
        <button aria-busy="true" hidden={status !== 'loading'}>
          Loading model...
        </button>
        <button aria-busy="true" hidden={status !== 'loaded'}>
          Loaded model
        </button>
        <button aria-busy="true" hidden={status !== 'generating'}>
          Generating...
        </button>
      </section>

      <section>
        {status !== 'idle' && <progress />}
      </section>
    </main>
  );
}
