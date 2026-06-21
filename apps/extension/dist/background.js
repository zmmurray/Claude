"use strict";
(() => {
  // src/background.ts
  chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => console.error("SceneArc: failed to set panel behavior", err));
  });
})();
