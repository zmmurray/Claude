"use strict";
(() => {
  // src/adapters/mock.ts
  var mockAdapter = {
    id: "mock_generator",
    displayName: "SceneArc Mock Generator",
    matches(url) {
      return url.includes("/dev/mock-generator");
    },
    detectPage() {
      return Boolean(document.querySelector('[data-scenearc="prompt"]'));
    },
    insertPrompt(prompt) {
      const el = document.querySelector(
        '[data-scenearc="prompt"]'
      );
      if (!el) return false;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      setter?.call(el, prompt);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    },
    detectResults() {
      const nodes = document.querySelectorAll('[data-scenearc="result"]');
      const results = [];
      nodes.forEach((node) => {
        const src = node.getAttribute("data-result-src");
        const kind = node.getAttribute("data-result-kind") === "video" ? "video" : "image";
        if (src) results.push({ kind, src });
      });
      return results;
    },
    getSelectedResult() {
      const node = document.querySelector(
        '[data-scenearc="result"][data-selected="true"]'
      );
      if (!node) return null;
      const src = node.getAttribute("data-result-src");
      if (!src) return null;
      const kind = node.getAttribute("data-result-kind") === "video" ? "video" : "image";
      return { kind, src };
    }
  };

  // src/adapters/index.ts
  var adapters = [mockAdapter];
  function pickAdapter(url) {
    return adapters.find((a) => a.matches(url)) ?? null;
  }

  // src/content.ts
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const adapter = pickAdapter(window.location.href);
    if (!adapter || !adapter.detectPage()) {
      sendResponse({ ok: false, error: "This page isn't a supported SceneArc generator." });
      return true;
    }
    switch (message.type) {
      case "PING":
        sendResponse({ ok: true, platform: adapter.displayName });
        break;
      case "INSERT_PROMPT":
        sendResponse({ ok: adapter.insertPrompt(message.prompt) });
        break;
      case "DETECT_RESULTS":
        sendResponse({ ok: true, count: adapter.detectResults().length });
        break;
      case "GET_SELECTED_RESULT": {
        const result = adapter.getSelectedResult();
        sendResponse(result ? { ok: true, result } : { ok: false, error: "No result selected." });
        break;
      }
      default:
        sendResponse({ ok: false, error: "Unknown command." });
    }
    return true;
  });
})();
