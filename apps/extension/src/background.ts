/** Background service worker: open the side panel when the toolbar icon is clicked. */
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error("SceneArc: failed to set panel behavior", err));
});
