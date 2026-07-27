// js/modal-sequencing.js
// Generic, DOM-id-based helper for sequencing celebration modals. Any
// celebration module can use this to let other code know when its overlay
// has closed, without those callers needing to know anything about the
// module's internals. Used by streak-celebration.js, achievement-celebration.js,
// and first-believer.js.

// waitForOverlayClose(elementId)
// Resolves once the element with the given id is no longer in the DOM.
// Resolves immediately if the element isn't present when called — this is
// what makes it safe to await unconditionally: for a user who never sees a
// given overlay, the wait is a no-op.
export function waitForOverlayClose(elementId) {
  return new Promise(resolve => {
    const el = document.getElementById(elementId);
    if (!el) { resolve(); return; }
    const observer = new MutationObserver(() => {
      if (!document.getElementById(elementId)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
