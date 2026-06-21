import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { ExtensionContextResponse, ResultDecision } from "@scenearc/shared";

import { decide, getContext, importResult, pair } from "../lib/api";
import { clearAuth, getState, setState } from "../lib/storage";

const s: Record<string, CSSProperties> = {
  h1: { fontSize: 16, margin: "0 0 2px", letterSpacing: 1 },
  amber: { color: "var(--amber)" },
  muted: { color: "var(--muted)", fontSize: 12 },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  label: { display: "block", fontSize: 12, color: "var(--muted)", margin: "8px 0 4px" },
  input: {
    width: "100%",
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
  },
  btn: {
    background: "var(--amber)",
    color: "#15140f",
    border: "none",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  btnSecondary: {
    background: "transparent",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
    width: "100%",
  },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 },
  pre: {
    whiteSpace: "pre-wrap",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: 10,
    fontSize: 12,
    maxHeight: 160,
    overflowY: "auto",
  },
};

async function sendToTab(message: unknown): Promise<{ ok: boolean; [k: string]: unknown }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab. Open the generator page first.");
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    throw new Error("Couldn't reach the page. Open the generator tab, then try again.");
  }
}

export function App() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"pair" | "main">("pair");
  const [appUrl, setAppUrl] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [account, setAccount] = useState("");
  const [context, setContext] = useState<ExtensionContextResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastResultId, setLastResultId] = useState<string | undefined>(undefined);
  const [revisionNotes, setRevisionNotes] = useState("");

  const refresh = useCallback(async (url: string, tok: string) => {
    setError("");
    try {
      const ctx = await getContext(url, tok);
      setContext(ctx);
      setAccount(ctx.account.email);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load.";
      if (msg.toLowerCase().includes("paired") || msg.includes("401")) {
        await clearAuth();
        setToken("");
        setView("pair");
        setError("Your pairing expired. Please pair again.");
      } else {
        setError(msg);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const state = await getState();
      if (state.appUrl) setAppUrl(state.appUrl);
      if (state.lastResultId) setLastResultId(state.lastResultId);
      if (state.token && state.appUrl) {
        setToken(state.token);
        setAccount(state.accountEmail ?? "");
        setView("main");
        await refresh(state.appUrl, state.token);
      }
      setReady(true);
    })();
  }, [refresh]);

  async function handlePair() {
    setError("");
    setMessage("");
    if (!appUrl.trim() || !code.trim()) {
      setError("Enter your SceneArc URL and the pairing code.");
      return;
    }
    setBusy(true);
    try {
      const res = await pair(appUrl.trim(), code.trim());
      await setState({ appUrl: appUrl.trim(), token: res.token, accountEmail: res.account.email });
      setToken(res.token);
      setAccount(res.account.email);
      setView("main");
      setCode("");
      await refresh(appUrl.trim(), res.token);
      setMessage("Paired ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pairing failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    await clearAuth();
    setToken("");
    setContext(null);
    setLastResultId(undefined);
    setView("pair");
    setMessage("Disconnected.");
  }

  function run(label: string, fn: () => Promise<void>) {
    return async () => {
      setBusy(true);
      setError("");
      setMessage("");
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : `${label} failed.`);
      } finally {
        setBusy(false);
      }
    };
  }

  const task = context?.activeTask ?? null;

  const copyPrompt = run("Copy", async () => {
    if (!task) throw new Error("No active task.");
    await navigator.clipboard.writeText(task.prompt);
    setMessage("Prompt copied.");
  });

  const insertPrompt = run("Insert", async () => {
    if (!task) throw new Error("No active task.");
    const resp = await sendToTab({ type: "INSERT_PROMPT", prompt: task.prompt });
    if (!resp.ok) throw new Error((resp.error as string) ?? "Insert failed.");
    setMessage("Prompt inserted. Click Generate on the site yourself.");
  });

  const detectResults = run("Detect", async () => {
    const resp = await sendToTab({ type: "DETECT_RESULTS" });
    if (!resp.ok) throw new Error((resp.error as string) ?? "Detection failed.");
    setMessage(`Detected ${resp.count as number} result(s). Select one on the page.`);
  });

  const sendSelected = run("Send result", async () => {
    if (!task) throw new Error("No active task.");
    const resp = await sendToTab({ type: "GET_SELECTED_RESULT" });
    if (!resp.ok) throw new Error((resp.error as string) ?? "No result selected.");
    const result = resp.result as { kind: "image" | "video"; src: string };
    const body =
      result.src.startsWith("data:")
        ? { taskId: task.taskId, kind: result.kind, source: "extension" as const, dataUrl: result.src }
        : { taskId: task.taskId, kind: result.kind, source: "extension" as const, sourceUrl: result.src };
    const out = await importResult(appUrl, token, body);
    setLastResultId(out.resultId);
    await setState({ lastResultId: out.resultId });
    setMessage("Result sent to SceneArc ✓");
  });

  async function handleManualUpload(file: File) {
    if (!task) {
      setError("No active task.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
      });
      const kind = file.type.startsWith("video") ? "video" : "image";
      const out = await importResult(appUrl, token, {
        taskId: task.taskId,
        kind,
        source: "manual",
        dataUrl,
      });
      setLastResultId(out.resultId);
      await setState({ lastResultId: out.resultId });
      setMessage("Uploaded to SceneArc ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function decideOn(decision: ResultDecision) {
    return run("Decision", async () => {
      if (!lastResultId) throw new Error("Import a result first.");
      await decide(appUrl, token, lastResultId, decision, revisionNotes || undefined);
      setMessage(`Marked: ${decision.replace("_", " ")}.`);
    });
  }

  if (!ready) return <p style={s.muted}>Loading…</p>;

  return (
    <div>
      <h1 style={s.h1}>
        SCENE<span style={s.amber}>ARC</span>
      </h1>
      <p style={s.muted}>{view === "main" ? account : "Companion extension"}</p>

      {error ? <div style={{ ...s.card, color: "var(--danger)" }}>{error}</div> : null}
      {message ? <div style={{ ...s.card, color: "var(--amber)" }}>{message}</div> : null}

      {view === "pair" ? (
        <div style={s.card}>
          <strong>Pair with SceneArc</strong>
          <p style={s.muted}>
            In SceneArc → Settings → Chrome extension, generate a code. Then enter your SceneArc web
            address and the code here.
          </p>
          <label style={s.label}>SceneArc URL</label>
          <input
            style={s.input}
            placeholder="https://your-app.vercel.app"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
          />
          <label style={s.label}>Pairing code</label>
          <input
            style={s.input}
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div style={{ marginTop: 10 }}>
            <button style={s.btn} onClick={handlePair} disabled={busy}>
              {busy ? "Pairing…" : "Pair"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {task ? (
            <div style={s.card}>
              <div style={{ fontSize: 13 }}>
                <strong style={s.amber}>{task.projectTitle}</strong>
              </div>
              <div style={s.muted}>
                {task.sceneNumber ? `Scene ${task.sceneNumber}` : "No scene"}
                {task.sceneSlugline ? ` · ${task.sceneSlugline}` : ""} · {task.status}
              </div>
              <label style={s.label}>Prepared prompt</label>
              <div style={s.pre}>{task.prompt}</div>
              {task.references.length > 0 ? (
                <>
                  <label style={s.label}>References</label>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                    {task.references.map((r, i) => (
                      <li key={i}>
                        {r.label}
                        {r.required ? "" : " (optional)"}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : (
            <div style={s.card}>
              <p style={s.muted}>
                No active task. In SceneArc, open a scene → create a prompt package → “Send to
                extension”, then press Refresh here.
              </p>
            </div>
          )}

          <div style={s.card}>
            <strong style={{ fontSize: 13 }}>Workflow</strong>
            <div style={s.row}>
              <button style={s.btnSecondary} onClick={copyPrompt} disabled={busy || !task}>
                Copy Prompt
              </button>
              <button style={s.btnSecondary} onClick={insertPrompt} disabled={busy || !task}>
                Insert Prompt
              </button>
            </div>
            <div style={s.row}>
              <button style={s.btnSecondary} onClick={detectResults} disabled={busy}>
                Detect Results
              </button>
              <button style={s.btn} onClick={sendSelected} disabled={busy || !task}>
                Send Selected
              </button>
            </div>
            <label style={s.label}>Manual upload (if auto-import fails)</label>
            <input
              type="file"
              accept="image/*,video/*"
              disabled={busy || !task}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleManualUpload(file);
              }}
              style={{ fontSize: 12 }}
            />
          </div>

          <div style={s.card}>
            <strong style={{ fontSize: 13 }}>Decision on last imported result</strong>
            <div style={s.row}>
              <button style={s.btn} onClick={decideOn("approved")} disabled={busy || !lastResultId}>
                Approve
              </button>
              <button
                style={s.btnSecondary}
                onClick={decideOn("rejected")}
                disabled={busy || !lastResultId}
              >
                Reject
              </button>
            </div>
            <label style={s.label}>Revision notes</label>
            <input
              style={s.input}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="What to change…"
            />
            <div style={{ marginTop: 8 }}>
              <button
                style={s.btnSecondary}
                onClick={decideOn("revision_requested")}
                disabled={busy || !lastResultId}
              >
                Request Revision
              </button>
            </div>
          </div>

          <div style={s.row}>
            <button
              style={s.btnSecondary}
              onClick={run("Refresh", async () => refresh(appUrl, token))}
              disabled={busy}
            >
              Refresh
            </button>
            <button style={s.btnSecondary} onClick={handleDisconnect} disabled={busy}>
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
