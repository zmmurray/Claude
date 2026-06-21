import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { build } from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const common = {
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome110",
  jsx: "automatic",
  minify: false,
  sourcemap: false,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
};

await build({
  ...common,
  entryPoints: [resolve(root, "src/background.ts")],
  outfile: resolve(dist, "background.js"),
});

await build({
  ...common,
  entryPoints: [resolve(root, "src/content.ts")],
  outfile: resolve(dist, "content.js"),
});

await build({
  ...common,
  entryPoints: [resolve(root, "src/sidepanel/main.tsx")],
  outfile: resolve(dist, "sidepanel.js"),
});

cpSync(resolve(root, "manifest.json"), resolve(dist, "manifest.json"));
cpSync(resolve(root, "public/sidepanel.html"), resolve(dist, "sidepanel.html"));

console.log("✓ Extension built to apps/extension/dist");
