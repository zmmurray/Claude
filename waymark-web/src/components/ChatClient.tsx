"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import type { ChatMessage } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatClient({ initial }: { initial: ChatMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial.map((m) => ({ role: m.role, content: m.content })));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [ready, setReady] = useState(false);
  const [going, setGoing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy, ready]);

  // Grow the textarea with its content (up to a cap).
  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }
  useEffect(autosize, [input]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true); setSavedNote(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "…" }]);
      if (data.changed) setSavedNote(true);
      if (data.ready) setReady(true);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something glitched — say that again?" }]);
    } finally { setBusy(false); }
  }

  async function goToFocus() {
    setGoing(true);
    try {
      await fetch("/api/strategize", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    } catch {}
    router.push("/today");
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 9rem)" }}>
      <h1 className="text-xl font-semibold mb-4 on-bg">{copy.chat.title}</h1>

      <div className="flex-1 space-y-3">
        {messages.length === 0 && <div className="card p-5 text-ink-soft leading-relaxed">{copy.chat.intro}</div>}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${m.role === "user" ? "bg-moss text-white" : "card"}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {busy && <div className="text-sm on-bg-soft">{copy.chat.thinking}</div>}
        {savedNote && <div className="text-sm on-bg-soft">Saved that to your plate.</div>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 pt-3 pb-2 space-y-3">
        {ready && (
          <button onClick={goToFocus} disabled={going} className="btn-primary w-full">
            {going ? "One sec…" : copy.chat.ready} →
          </button>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder={copy.chat.placeholder}
            className="input resize-none flex-1 overflow-hidden"
          />
          <button onClick={send} disabled={busy} className="btn-primary">{copy.chat.send}</button>
        </div>
      </div>
    </div>
  );
}
