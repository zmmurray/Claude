/**
 * Platform adapter contract. Each generation platform gets one adapter; all
 * platform-specific DOM selectors live inside that adapter. Phase Two ships only
 * the mock adapter; real platforms are added in Phase Three.
 */
export interface DetectedResult {
  kind: "image" | "video";
  /** A data: URL (inline) or an http(s) URL. */
  src: string;
}

export interface PlatformAdapter {
  readonly id: string;
  readonly displayName: string;
  /** Supported URL test. */
  matches(url: string): boolean;
  /** Whether the current page looks like this platform's generator. */
  detectPage(): boolean;
  /** Insert a prompt into the platform's prompt field. Never clicks Generate. */
  insertPrompt(prompt: string): boolean;
  /** Find available result tiles. */
  detectResults(): DetectedResult[];
  /** The result the user has selected, if any. */
  getSelectedResult(): DetectedResult | null;
}
