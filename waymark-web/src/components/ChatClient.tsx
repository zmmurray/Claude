"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import type { ChatMessage } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatClient({ initial }: { initial: ChatMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial.map((m) => ({ role: m.role, content: m.content })));

  // Always reload saved history from the database on mount, so navigating back to
  // the chat shows the real conversation (not a cached empty page).
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase
      .from("chat_messages")
      .select("role,content")
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (data && data.length) setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
      });
  }, []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [ready, setReady] = useState(false);
  const [going, setGoing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // --- Voice: talk it out, words land in the box (phone's own speech engine) ---
  const recogRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setMicSupported(!!SR);
  }, []);

  function toggleMic() {
    if (listening) { try { recogRef.current?.stop(); } catch {} setListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicNote("Voice isn't supported here — use your keyboard's mic instead."); return; }

    let r: any;
    try { r = new SR(); } catch { setMicNote("Couldn't start the mic — try again."); return; }
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false; // iOS Safari is flaky with continuous mode

    const base = input ? input.replace(/\s*$/, "") + " " : "";
    r.onstart = () => { setMicNote(null); setListening(true); };
    r.onresult = (e: any) => {
      let said = "";
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      setInput(base + said);
    };
    r.onerror = (e: any) => {
      const err = e?.error;
      if (err === "not-allowed" || err === "service-not-allowed")
        setMicNote("Mic is blocked. Allow microphone for this site in Safari, then tap again.");
      else if (err === "no-speech")
        setMicNote("Didn't catch anything — tap the mic and try again.");
      else if (err !== "aborted")
        setMicNote("Mic stopped — tap to try again.");
      setListening(false);
    };
    r.onend = () => setListening(false);

    recogRef.current = r;
    setMicNote(null);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setMicNote("Couldn't start the mic — tap to try again.");
    }
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy, ready]);

  // Grow the textarea with its content (up to a cap).
  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }
  useEffect(autosize, [input]);

  // If we arrived from "Add more info" on a project, pre-fill the box so the
  // person can just start talking about that project.
  useEffect(() => {
    const about = new URLSearchParams(window.location.search).get("about");
    if (about) {
      setInput(`A bit more about ${about}: `);
      setTimeout(() => taRef.current?.focus(), 0);
    }
  }, []);

  async function send() {
    if (listening) recogRef.current?.stop();
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
      <h1 className="font-display text-2xl mb-4 text-pine">{copy.chat.title}</h1>

      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="card p-5 text-ink-soft leading-relaxed space-y-3">
            <p>{copy.chat.intro}</p>
            <ul className="space-y-1.5 text-sm text-ink-faint">
              {copy.chat.tips.map((tip, i) => (
                <li key={i} className="flex gap-2"><span className="text-sage-deep">•</span><span>{tip}</span></li>
              ))}
            </ul>
          </div>
        )}
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

      <div className="sticky bottom-24 pt-3 space-y-3">
        {ready && (
          <button onClick={goToFocus} disabled={going} className="btn-primary w-full">
            {going ? "One sec…" : copy.chat.ready} →
          </button>
        )}
        {listening && <div className="text-sm text-clay text-center">Listening… talk away, tap the mic to stop.</div>}
        {micNote && !listening && <div className="text-sm text-clay text-center">{micNote}</div>}
        <div className="flex gap-2 items-end">
          {micSupported && (
            <button onClick={toggleMic} aria-label="Talk it out"
              className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center transition"
              style={listening
                ? { background: "#b06a52", color: "#fff", boxShadow: "0 0 0 6px rgba(176,106,82,0.18)" }
                : { background: "rgba(255,255,255,0.6)", border: "1px solid rgba(142,182,155,0.45)", color: "#235347" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="8" y1="21" x2="16" y2="21" />
              </svg>
            </button>
          )}
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
