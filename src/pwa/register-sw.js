export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  const registrationPromise = navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      return registration;
    })
    .catch((error) => {
      console.error("Service worker registration failed", error);
      return undefined;
    });
  return registrationPromise;
}

export async function ensureServiceWorkerReady() {
  if (!("serviceWorker" in navigator)) {
    return undefined;
  }
  const ready = await navigator.serviceWorker.ready;
  return ready;
}
