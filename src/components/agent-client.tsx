"use client";
import { useState } from "react";

type Finding = { title: string; detail: string; classification: string; confidence: string; evidence: string[]; recommended_step: string; priority: string; limitations?: string };
type Result = { summary: string; findings: Finding[]; data_gaps: string[] };

export function AgentRunner({ agentKey, enabled }: { agentKey: string; enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    setBusy(true); setErr(null); setRes(null);
    const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "agent", agent: agentKey }) });
    const j = await r.json();
    if (!r.ok) setErr(j.error ?? "Request failed"); else setRes(j.result);
    setBusy(false);
  }
  return (
    <div className="mt-3">
      <button className="btn-dark" onClick={run} disabled={busy || !enabled}>{busy ? "Analysing…" : enabled ? "Run agent" : "Gemini not configured"}</button>
      {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
      {res && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="font-medium">{res.summary}</p>
          {res.findings.map((f, i) => (
            <div key={i} className="rounded-lg bg-ivory p-3">
              <div className="font-semibold">{f.title} <span className="text-xs font-normal text-slate">· {f.classification.replace(/_/g, " ")} · {f.confidence} confidence · {f.priority} priority</span></div>
              <p>{f.detail}</p>
              {f.evidence.length > 0 && <p className="text-xs text-slate">Evidence: {f.evidence.join(" · ")}</p>}
              <p className="text-xs"><b>Suggested next step (needs human review):</b> {f.recommended_step}</p>
              {f.limitations && <p className="text-xs text-slate">Limitations: {f.limitations}</p>}
            </div>))}
          {res.data_gaps.length > 0 && <p className="text-xs text-amber-dark"><b>Data gaps:</b> {res.data_gaps.join("; ")}</p>}
          <p className="text-xs text-slate">Findings were saved to Operational Insights; medium/high priority ones were added as pending actions.</p>
        </div>
      )}
    </div>
  );
}
