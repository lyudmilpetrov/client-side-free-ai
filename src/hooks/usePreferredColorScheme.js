import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "client-side-free-ai:theme";

const getStoredPreference = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
};

const getSystemPrefersLight = () => {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
};

const applyDocumentTheme = (isLight) => {
  if (typeof document === "undefined") return;
  const theme = isLight ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

export function usePreferredColorScheme() {
  const [hasUserPreference, setHasUserPreference] = useState(() => getStoredPreference() !== null);

  const initialIsLight = useMemo(() => {
    const stored = getStoredPreference();
    if (stored === "light") return true;
    if (stored === "dark") return false;
    return getSystemPrefersLight();
  }, []);

  const [isLightMode, setIsLightMode] = useState(() => {
    applyDocumentTheme(initialIsLight);
    return initialIsLight;
  });

  useEffect(() => {
    applyDocumentTheme(isLightMode);
    if (typeof window !== "undefined") {
      const theme = isLightMode ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [isLightMode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (event) => {
      if (!hasUserPreference) {
        setIsLightMode(event.matches);
      }
    };

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [hasUserPreference]);

  const setLightMode = useCallback((value) => {
    setHasUserPreference(true);
    setIsLightMode(Boolean(value));
  }, []);

  const toggleMode = useCallback(() => {
    setHasUserPreference(true);
    setIsLightMode((previous) => !previous);
  }, []);

  const resetToSystemPreference = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHasUserPreference(false);
    setIsLightMode(getSystemPrefersLight());
  }, []);

  return {
    isLightMode,
    setLightMode,
    toggleMode,
    resetToSystemPreference,
    hasUserPreference,
  };
}
