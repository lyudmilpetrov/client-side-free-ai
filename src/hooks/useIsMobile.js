import { useEffect, useState } from "react";

const DEFAULT_BREAKPOINT = 768;

/**
 * useIsMobile reports whether the viewport width is smaller than the provided breakpoint.
 * It mirrors the behaviour of popular "is mobile" hooks so the UI can react to responsive
 * breakpoints without relying on window globals during SSR.
 */
export function useIsMobile(breakpoint = DEFAULT_BREAKPOINT) {
  const getMatches = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  };

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handleChange = (event) => setIsMobile(event.matches);

    // Sync in case the breakpoint changed after the first render.
    setIsMobile(query.matches);

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isMobile;
}
