"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import type { ChatMessage } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatClient({ initial }: { initial: ChatMessage[] }) {
  const [messages, setMessages] = useState<Msg[]>(
    initial.map((m) => ({ role: m.role, content: m.content }))
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

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
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something glitched — say that again?" }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 9rem)" }}>
      <h1 className="text-xl font-semibold mb-4">{copy.chat.title}</h1>

      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="card p-5 text-ink-soft leading-relaxed">{copy.chat.intro}</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
              m.role === "user" ? "bg-moss text-white" : "card"
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-ink-faint">{copy.chat.thinking}</div>}
        {savedNote && <div className="text-sm text-moss">Saved that to your plate.</div>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 pt-3 pb-1 bg-gradient-to-t from-canvas to-transparent">
        <div className="flex gap-2 items-end">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={copy.chat.placeholder}
            className="input resize-none flex-1"
          />
          <button onClick={send} disabled={busy} className="btn-primary">{copy.chat.send}</button>
        </div>
      </div>
    </div>
  );
}
