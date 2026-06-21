import type { DetectedResult, PlatformAdapter } from "./types";

/** Adapter for the SceneArc development mock generator (/dev/mock-generator). */
export const mockAdapter: PlatformAdapter = {
  id: "mock_generator",
  displayName: "SceneArc Mock Generator",

  matches(url: string): boolean {
    return url.includes("/dev/mock-generator");
  },

  detectPage(): boolean {
    return Boolean(document.querySelector('[data-scenearc="prompt"]'));
  },

  insertPrompt(prompt: string): boolean {
    const el = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      '[data-scenearc="prompt"]',
    );
    if (!el) return false;
    // Set the value via the native setter so React/controlled inputs update.
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(el, prompt);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  },

  detectResults(): DetectedResult[] {
    const nodes = document.querySelectorAll<HTMLElement>('[data-scenearc="result"]');
    const results: DetectedResult[] = [];
    nodes.forEach((node) => {
      const src = node.getAttribute("data-result-src");
      const kind = node.getAttribute("data-result-kind") === "video" ? "video" : "image";
      if (src) results.push({ kind, src });
    });
    return results;
  },

  getSelectedResult(): DetectedResult | null {
    const node = document.querySelector<HTMLElement>(
      '[data-scenearc="result"][data-selected="true"]',
    );
    if (!node) return null;
    const src = node.getAttribute("data-result-src");
    if (!src) return null;
    const kind = node.getAttribute("data-result-kind") === "video" ? "video" : "image";
    return { kind, src };
  },
};
