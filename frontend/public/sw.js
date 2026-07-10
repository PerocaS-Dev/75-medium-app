// Minimal service worker for installability.
//
// Its only job is to exist with a fetch handler — that is what lets Chrome /
// Android offer the one-tap "Install app" prompt. It intentionally does NOT
// cache anything, so the app is never served stale: every request passes
// straight through to the network exactly as if no service worker were present.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // no-op — let the browser handle each request over the network as normal.
});
