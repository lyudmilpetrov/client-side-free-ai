import React, { useState, useRef } from 'react';
import { createLlama } from '../llamaWasmLoader.js';

export default function App() {
  const [prompt, setPrompt]     = useState('');
  const [output, setOutput]     = useState('');
  const [loading, setLoading]   = useState(false);  
  const llamaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setOutput('');
    setLoading(true);

    // Initialize on first use
    const llm = llamaRef.current || createLlama(
      () => setLoading(false),             // onLoad
      (chunk) => setOutput((o) => o + chunk), // onChunk
      () => setLoading(false)              // onComplete
    );
    llamaRef.current = llm;

    // Kick off generation
    llm.run({
      prompt: prompt,
      ctx_size: 32768,
      temp: 0.8,
      no_display_prompt: true
    });
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Qwen3-0.6B in Browser (Wasm)</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={4}
          style={{ width: '100%' }}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter prompt…"
        />
        <button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>
      <pre style={{
        marginTop: '1rem',
        background: '#f4f4f4',
        padding: '1rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {output}
      </pre>
    </div>
  );
}
