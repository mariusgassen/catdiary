// Minimal service worker: enables "Add to Home Screen" install prompts.
// Caching strategy stays intentionally absent for now — add one when offline
// support becomes a real requirement (see roadmap Phase 4).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
