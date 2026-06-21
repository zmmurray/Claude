import { pickAdapter } from "./adapters";

/**
 * Content script injected into supported generation pages. It only reacts to
 * explicit commands from the SceneArc side panel — it never auto-clicks Generate.
 */

type Message =
  | { type: "PING" }
  | { type: "INSERT_PROMPT"; prompt: string }
  | { type: "DETECT_RESULTS" }
  | { type: "GET_SELECTED_RESULT" };

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
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
