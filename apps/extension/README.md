# SceneArc Chrome Extension (Phase Two)

A Manifest V3 side-panel extension that pairs with your SceneArc account, inserts
prepared prompts onto generation sites, and imports selected results back into
the correct project / scene / task.

> **You need a desktop computer with Google Chrome.** Extensions can't be loaded
> on a phone.

SceneArc never auto-clicks a "Generate" button — you always click it yourself.

---

## What's in `dist/`

The folder `apps/extension/dist/` is the **ready-to-load, prebuilt extension**.
It's committed on purpose so you don't need to build anything.

(Developers: rebuild it with `pnpm --filter @scenearc/extension build`.)

---

## Install it in Chrome (one time, ~2 minutes)

1. **Get the files onto your computer.** On the GitHub page for this repository,
   click the green **Code** button → **Download ZIP**. Unzip it. You'll have a
   folder containing `apps/extension/dist`.
2. Open Chrome and go to **chrome://extensions** (type it in the address bar).
3. Turn on **Developer mode** (toggle, top-right).
4. Click **Load unpacked** (top-left).
5. Select the folder **`apps/extension/dist`** from the unzipped download.
6. SceneArc appears in your extensions. Click the **puzzle-piece icon** in
   Chrome's toolbar and **pin** SceneArc so it's always visible.

---

## Pair it with your account

1. In the SceneArc web app, go to **Settings → Chrome extension** and click
   **Generate pairing code**. A code like `ABCD-2345` appears (valid 10 minutes).
2. Click the **SceneArc toolbar icon** to open the side panel.
3. Enter your **SceneArc URL** (your `…vercel.app` address) and the **pairing
   code**, then click **Pair**.
4. The panel now shows your account. You can **Disconnect** anytime (or revoke it
   from Settings).

---

## Try the full workflow (with the mock generator)

1. In SceneArc: open a project → **approve** its breakdown → open a **scene** →
   **Create prompt package** → on the package page click **Send to extension**.
2. In the extension side panel, click **Refresh**. You should see the project,
   scene, and prepared prompt.
3. Open the **mock generator**: go to `https://YOUR-APP.vercel.app/dev/mock-generator`
   in a new tab (replace with your address).
4. In the side panel, click **Insert Prompt** — the prompt drops into the page.
5. On the page, click **Generate** yourself. Fake results appear.
6. Click one result to **select** it (gold border).
7. In the side panel, click **Send Selected** — the result imports into SceneArc.
8. Click **Approve**, **Reject**, or add notes and **Request Revision**.
9. Back in SceneArc, the package page shows the imported result with its status.

**Manual upload fallback:** if automatic sending ever fails, use **Manual upload**
in the side panel to pick an image/video file and import it directly.

---

## Notes

- Permissions are intentionally minimal (storage, side panel, the active tab, and
  your app's domain).
- No third-party passwords or platform cookies are ever stored.
- The mock generator is for development/testing only.
