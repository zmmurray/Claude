/** Thin promise wrapper over chrome.storage.local for the extension's state. */

export interface ExtensionState {
  appUrl?: string;
  token?: string;
  accountEmail?: string;
  lastResultId?: string;
}

export async function getState(): Promise<ExtensionState> {
  return new Promise((res) => {
    chrome.storage.local.get(
      ["appUrl", "token", "accountEmail", "lastResultId"],
      (items) => res(items as ExtensionState),
    );
  });
}

export async function setState(patch: Partial<ExtensionState>): Promise<void> {
  return new Promise((res) => {
    chrome.storage.local.set(patch, () => res());
  });
}

export async function clearAuth(): Promise<void> {
  return new Promise((res) => {
    chrome.storage.local.remove(["token", "accountEmail", "lastResultId"], () => res());
  });
}
