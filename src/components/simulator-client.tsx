"use client";
import { useMemo, useState } from "react";
import { saveScenario } from "@/app/actions";
import { BarsChart } from "@/components/charts";
import { simulate, type Scenario, type ScenarioType, type SimLine, type SimOrder } from "@/lib/simulation";

const TYPES: { key: ScenarioType; label: string; unit: string; needsLine?: boolean; needsDays?: boolean; pct?: boolean }[] = [
  { key: "demand_increase", label: "Increased production demand", unit: "% change in all open order quantities", pct: true },
  { key: "quantity_change", label: "Different production quantities", unit: "% change in order quantities", pct: true },
  { key: "availability_change", label: "Reduced / increased machine availability", unit: "% change in line availability (negative = reduction)", pct: true },
  { key: "capacity_change", label: "Production capacity change", unit: "% change in nominal line capacity", pct: true },
  { key: "line_unavailable", label: "Production line unavailable", unit: "", needsLine: true, needsDays: true },
  { key: "maintenance_window", label: "Planned maintenance window", unit: "", needsLine: true, needsDays: true },
];

const n = (v: number | null, d = 1) => (v === null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d }));

export function SimulatorClient({ lines, orders, factoryId, gaps, canSave, aiEnabled }: { lines: SimLine[]; orders: SimOrder[]; factoryId: string | null; gaps: string[]; canSave: boolean; aiEnabled: boolean }) {
  const [type, setType] = useState<ScenarioType>("demand_increase");
  const [percent, setPercent] = useState(20);
  const [lineId, setLineId] = useState("");
  const [days, setDays] = useState(2);
  const [hours, setHours] = useState(8);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [narr, setNarr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const def = TYPES.find((t) => t.key === type)!;

  const scenario: Scenario = { type, percent: def.pct ? percent : undefined, lineId: lineId || undefined, days: def.needsDays ? days : undefined, hoursPerDay: hours };
  const result = useMemo(() => simulate(lines, orders, scenario), [lines, orders, type, percent, lineId, days, hours]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lines.length || !orders.length) {
    return <div className="card p-6 text-sm text-steel">The simulator needs at least one production line with a nominal capacity and one open production order assigned to a line. {gaps.map((g) => <div key={g}>• {g}</div>)}</div>;
  }
  const chart = result.baseline.orders.map((o, i) => ({ name: o.orderNo, baseline: o.completionDays && +o.completionDays.toFixed(2), scenario: result.scenario.orders[i]?.completionDays && +result.scenario.orders[i].completionDays!.toFixed(2), due: o.dueInDays && +o.dueInDays.toFixed(2) }));

  async function save() {
    if (!name.trim()) return setStatus("Name the scenario before saving.");
    const r = await saveScenario(name.trim(), type, factoryId, scenario, result);
    setStatus(r.error ?? "Scenario saved.");
  }
  async function explain() {
    setBusy(true); setNarr(null);
    const res = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mode: "copilot", agent: "operational_simulation",
      message: `Explain this deterministic simulation result for a plant manager. Do not change any numbers. Scenario: ${JSON.stringify(scenario)}. Result: ${JSON.stringify({ deltas: result.deltas, baselineLate: result.baseline.lateCount, scenarioLate: result.scenario.lateCount, orders: result.scenario.orders.map((o) => ({ order: o.orderNo, completionDays: o.completionDays, dueInDays: o.dueInDays, late: o.late })) })}. State trade-offs and limitations.` }) });
    const j = await res.json();
    setNarr(res.ok ? j.text : j.error);
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="card space-y-4 p-4">
        <h2 className="font-semibold">Scenario assumptions</h2>
        <div><label className="label">Scenario type</label><select className="input" value={type} onChange={(e) => setType(e.target.value as ScenarioType)}>{TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
        {def.pct && <div><label className="label">{def.unit}</label><input type="number" className="input" value={percent} onChange={(e) => setPercent(Number(e.target.value))} /></div>}
        {(def.needsLine || type === "availability_change" || type === "capacity_change") && (
          <div><label className="label">Line {def.needsLine ? "" : "(blank = all)"}</label><select className="input" value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="">{def.needsLine ? "Select…" : "All lines"}</option>{lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        )}
        {def.needsDays && <div><label className="label">Days of lost production</label><input type="number" min={0} step="0.5" className="input" value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>}
        <div><label className="label">Productive hours per day</label><input type="number" min={1} max={24} className="input" value={hours} onChange={(e) => setHours(Math.min(24, Math.max(1, Number(e.target.value))))} /></div>
        <hr className="border-navy/10" />
        {canSave && <><input className="input" placeholder="Scenario name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-dark w-full" onClick={save}>Save scenario</button></>}
        <button className="btn-line w-full" onClick={explain} disabled={!aiEnabled || busy}>{busy ? "Explaining…" : aiEnabled ? "Explain with AI" : "AI unavailable (no Gemini key)"}</button>
        {status && <p role="status" className="text-sm text-steel">{status}</p>}
      </div>

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[["Late orders", `${result.baseline.lateCount} → ${result.scenario.lateCount}`, result.deltas.lateOrders], ["Total open demand", `${n(result.baseline.lines.reduce((a, l) => a + l.demand, 0), 0)} → ${n(result.scenario.lines.reduce((a, l) => a + l.demand, 0), 0)}`, result.deltas.totalDemand], ["Capacity / day", `${n(result.baseline.lines.reduce((a, l) => a + l.unitsPerDay, 0), 0)} → ${n(result.scenario.lines.reduce((a, l) => a + l.unitsPerDay, 0), 0)}`, -result.deltas.totalCapacityPerDay]].map(([l, v, delta]) => (
            <div key={String(l)} className="card p-4"><div className="text-xs font-semibold uppercase text-steel">{l}</div><div className="font-display text-xl font-bold">{v}</div>
              <div className={`text-xs ${Number(delta) > 0 ? "text-danger" : Number(delta) < 0 ? "text-ok" : "text-slate"}`}>baseline → scenario</div></div>))}
        </div>
        <div className="card p-4"><h3 className="mb-2 font-semibold">Estimated completion vs. due date (days from today)</h3>
          <BarsChart data={chart} keys={["baseline", "scenario", "due"]} /></div>
        <div className="card overflow-x-auto p-4"><table className="w-full min-w-[520px]"><thead><tr>{["Order", "Baseline", "Scenario", "Due in", "Outcome"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-navy/5">{result.scenario.orders.map((o, i) => (
            <tr key={o.orderId}><td className="td font-medium">{o.orderNo}</td><td className="td">{n(result.baseline.orders[i]?.completionDays)} d</td><td className="td">{n(o.completionDays)} d</td><td className="td">{n(o.dueInDays)} d</td>
              <td className="td">{o.late === null ? "No due date" : o.late ? <b className="text-danger">Late{o.slackDays !== null ? ` by ${n(-o.slackDays)} d` : ""}</b> : <span className="text-ok">On time</span>}</td></tr>))}</tbody></table></div>
        {narr && <div className="card whitespace-pre-wrap p-4 text-sm"><div className="mb-1 text-xs font-semibold uppercase text-steel">AI explanation — not simulation output</div>{narr}</div>}
        <div className="card p-4 text-sm"><h3 className="mb-1 font-semibold">Assumptions & limitations</h3>
          <ul className="list-disc pl-5 text-steel">{[...result.assumptions, ...result.limitations, ...gaps].map((a) => <li key={a}>{a}</li>)}</ul></div>
      </div>
    </div>
  );
}
