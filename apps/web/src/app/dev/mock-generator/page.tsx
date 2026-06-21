"use client";

import { useState } from "react";

/**
 * DEVELOPMENT-ONLY mock generator. A safe, fake "AI generation website" used to
 * practice the SceneArc extension workflow without touching a real platform.
 *
 * The SceneArc content-script adapter interacts with this page via the
 * `data-scenearc` attributes:
 *   - the prompt textarea:  data-scenearc="prompt"
 *   - the Generate button:  data-scenearc="generate"
 *   - each result tile:     data-scenearc="result" + data-result-kind + data-result-src
 *   - the selected tile is marked data-selected="true"
 *
 * SceneArc never auto-clicks Generate — the user always clicks it.
 */

interface MockResult {
  id: string;
  kind: "image" | "video";
  src: string;
  label: string;
}

function svgDataUrl(label: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-size="28"
      text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export default function MockGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<MockResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleGenerate() {
    if (phase === "loading") return;
    setPhase("loading");
    setResults([]);
    setSelectedId(null);
    setTimeout(() => {
      setResults([
        { id: "r1", kind: "image", src: svgDataUrl("Result 1", "#3a3a52"), label: "Variation 1" },
        { id: "r2", kind: "image", src: svgDataUrl("Result 2", "#52403a"), label: "Variation 2" },
        { id: "r3", kind: "image", src: svgDataUrl("Result 3", "#3a523f"), label: "Variation 3" },
        { id: "r4", kind: "image", src: svgDataUrl("Result 4", "#4a3a52"), label: "Variation 4" },
        { id: "v1", kind: "video", src: SAMPLE_VIDEO, label: "Motion draft" },
      ]);
      setPhase("done");
    }, 1200);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f1115",
        color: "#e8e8ea",
        fontFamily: "system-ui, sans-serif",
        padding: "32px 20px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <p style={{ fontSize: 12, letterSpacing: 2, color: "#8a8a9a", textTransform: "uppercase" }}>
          Mock Generator (development only)
        </p>
        <h1 style={{ fontSize: 26, margin: "6px 0 4px" }}>Pretend Image / Video Studio</h1>
        <p style={{ color: "#9a9aa6", fontSize: 14 }}>
          A safe stand-in for a real generation site. Insert a prompt from the SceneArc extension (or
          type one), click Generate, pick a result, and send it back to SceneArc.
        </p>

        <label style={{ display: "block", margin: "20px 0 6px", fontSize: 13, color: "#b8b8c4" }}>
          Prompt
        </label>
        <textarea
          data-scenearc="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="Your prompt will appear here…"
          style={{
            width: "100%",
            background: "#181b21",
            color: "#e8e8ea",
            border: "1px solid #2a2e37",
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
          }}
        />

        <div
          style={{
            marginTop: 12,
            border: "1px dashed #2a2e37",
            borderRadius: 8,
            padding: 16,
            color: "#7a7a88",
            fontSize: 13,
          }}
        >
          Reference images would be dropped here (mock).
        </div>

        <button
          data-scenearc="generate"
          onClick={handleGenerate}
          style={{
            marginTop: 16,
            background: "#d4a24a",
            color: "#15140f",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {phase === "loading" ? "Generating…" : "Generate"}
        </button>

        {phase === "loading" ? (
          <p style={{ marginTop: 20, color: "#9a9aa6" }}>● ● ●  rendering your shot…</p>
        ) : null}

        {phase === "done" ? (
          <>
            <h2 style={{ marginTop: 28, fontSize: 16 }}>Results — tap one to select</h2>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {results.map((r) => {
                const selected = selectedId === r.id;
                return (
                  <div
                    key={r.id}
                    data-scenearc="result"
                    data-result-kind={r.kind}
                    data-result-src={r.src}
                    data-selected={selected ? "true" : "false"}
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      border: selected ? "2px solid #d4a24a" : "2px solid #2a2e37",
                      borderRadius: 10,
                      padding: 8,
                      cursor: "pointer",
                      background: "#181b21",
                    }}
                  >
                    {r.kind === "video" ? (
                      <video src={r.src} controls style={{ width: "100%", borderRadius: 6 }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.src} alt={r.label} style={{ width: "100%", borderRadius: 6 }} />
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                        fontSize: 13,
                      }}
                    >
                      <span>{r.label}</span>
                      <a
                        href={r.src}
                        download={`${r.label}.${r.kind === "video" ? "mp4" : "svg"}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#d4a24a", fontSize: 12 }}
                      >
                        Download
                      </a>
                    </div>
                    {selected ? (
                      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#d4a24a" }}>Selected ✓</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
