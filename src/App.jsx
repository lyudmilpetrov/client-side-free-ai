import "./App.css";
import { ThemeToggle } from "./components/ThemeToggle.jsx";
import { LegacyLlamaChat } from "./components/LegacyLlamaChat.jsx";
import { PwaChatWindow } from "./components/PwaChatWindow.jsx";
// import { useIsMobile } from "./hooks/useIsMobile.js";
import { usePreferredColorScheme } from "./hooks/usePreferredColorScheme.js";

export default function App() {
  // const isMobile = useIsMobile();
  const { isLightMode, toggleMode } = usePreferredColorScheme();

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        {/* <div className="app-toolbar-meta">
          <span className="app-toolbar-pill">Mobile first</span>
          <span className="app-toolbar-caption">
            {isMobile
              ? "Optimized controls and typography for smaller screens."
              : "Responsive layout scales from phones to desktops without compromising clarity."}
          </span>
        </div> */}
        <ThemeToggle isLightMode={isLightMode} onToggle={toggleMode} />
      </div>

      <header className="app-header">
        <h1 className="app-title">Client-side Free AI</h1>
        <p className="app-subtitle">
          Run quantized language models entirely in the browser. WebGPU acceleration, WASM fallbacks, and offline caching work
          together so the chat experience persists even without a network.
        </p>
      </header>

      <div className="panel-grid">
        <LegacyLlamaChat />
        <PwaChatWindow />
      </div>
    </div>
  );
}
