import "./App.css";
import { LegacyLlamaChat } from "./components/LegacyLlamaChat.jsx";
import { PwaChatWindow } from "./components/PwaChatWindow.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Client-side Free AI</h1>
        <p className="app-subtitle">
          Run quantized language models entirely in the browser. WebGPU acceleration, WASM fallbacks, and offline caching work together so the chat experience persists even without a network.
        </p>
      </header>

      <div className="panel-grid">
        <LegacyLlamaChat />
        <PwaChatWindow />
      </div>
    </div>
  );
}
