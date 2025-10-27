function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 5.5a1 1 0 0 1-1-1V3a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1Zm6.364 2.136a1 1 0 0 1 0-1.414l1.061-1.06a1 1 0 0 1 1.414 1.414l-1.06 1.06a1 1 0 0 1-1.415 0ZM12 18.5a1 1 0 0 1 1 1V21a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1Zm8.5-6.5a1 1 0 0 1-1 1H18a1 1 0 1 1 0-2h1.5a1 1 0 0 1 1 1ZM6 12a1 1 0 0 1-1 1H3.5a1 1 0 0 1 0-2H5a1 1 0 0 1 1 1Zm1.636-4.364a1 1 0 0 1-1.414 0l-1.06-1.06A1 1 0 0 1 6.576 5.16l1.06 1.06a1 1 0 0 1 0 1.415Zm9.192 9.192a1 1 0 0 1 1.414 0l1.061 1.06a1 1 0 0 1-1.415 1.415l-1.06-1.06a1 1 0 0 1 0-1.415Zm-9.192 0a1 1 0 0 1 0 1.415l-1.06 1.06a1 1 0 0 1-1.415-1.414l1.06-1.06a1 1 0 0 1 1.415 0ZM12 8.5A3.5 3.5 0 1 0 15.5 12 3.5 3.5 0 0 0 12 8.5Z"
      />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12.227 2.25a1 1 0 0 1 .969.747 8.5 8.5 0 0 0 7.807 6.314 1 1 0 0 1 .842 1.5 9.5 9.5 0 1 1-10.134-4.662 1 1 0 0 1 .516-1.899Z"
      />
    </svg>
  );
}

export function ThemeToggle({ isLightMode, onToggle }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${isLightMode ? "dark" : "light"} mode`}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className={`theme-toggle-thumb ${isLightMode ? "is-light" : "is-dark"}`} />
      </span>
      <span className="theme-toggle-icons" aria-hidden="true">
        <SunIcon className={`theme-toggle-icon ${isLightMode ? "is-active" : ""}`} />
        <MoonIcon className={`theme-toggle-icon ${!isLightMode ? "is-active" : ""}`} />
      </span>
      <span className="theme-toggle-label">{isLightMode ? "Light" : "Dark"} mode</span>
    </button>
  );
}
