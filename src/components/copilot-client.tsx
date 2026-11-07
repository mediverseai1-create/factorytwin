"use client";
import { useRef, useState } from "react";

const SUGGESTIONS = [
  "What is happening across our factory?", "Which production line has the lowest output?", "What are the major bottlenecks?",
  "Which machines have repeated downtime?", "Which production orders are at risk of delay?", "What are the main causes of our recorded downtime?",
  "Where is our energy consumption increasing?", "Prepare an executive factory performance report.",
];
type Msg = { role: "user" | "ai"; text: string };

export function CopilotClient({ enabled, factories }: { enabled: boolean; factories: { id: string; name: string }[] }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [factory, setFactory] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]); setInput(""); setBusy(true);
    const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "copilot", agent: "factory_intelligence", message: text, factoryId: factory || undefined }) });
    const j = await r.json().catch(() => ({}));
    setMsgs((m) => [...m, { role: "ai", text: r.ok ? j.text : `⚠ ${j.error ?? "Request failed"}` }]);
    setBusy(false);
    setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="card flex min-h-[60vh] flex-col">
      <div className="flex items-center gap-3 border-b border-navy/10 p-3">
        <label className="label mb-0">Scope</label>
        <select className="input w-auto" value={factory} onChange={(e) => setFactory(e.target.value)}><option value="">All factories</option>{factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        {!enabled && <span className="text-xs text-amber-dark">Gemini is not configured — Copilot is disabled.</span>}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {!msgs.length && (<div><p className="mb-3 text-sm text-steel">Ask about your factory. Answers use your organization's recorded data, cite the records they rely on, and say what is missing.</p>
          <div className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <button key={s} className="btn-line text-xs" disabled={!enabled} onClick={() => send(s)}>{s}</button>)}</div></div>)}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-xl bg-navy p-3 text-sm text-ivory" : "max-w-[90%] whitespace-pre-wrap rounded-xl bg-ivory p-3 text-sm"}>{m.text}</div>))}
        {busy && <div className="text-sm text-slate">Analysing your factory data…</div>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-navy/10 p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask FactoryTwin Copilot…" maxLength={4000} disabled={!enabled} />
        <button className="btn-primary" disabled={!enabled || busy}>Send</button>
      </form>
      <p className="px-4 pb-3 text-xs text-slate">AI output is advisory and must be reviewed by qualified people. It is not an approved engineering procedure.</p>
    </div>
  );
}
