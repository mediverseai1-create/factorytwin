import Link from "next/link";
import { EntityPage } from "@/components/entity-page";
import { Badge, Empty, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { loadData } from "@/lib/data";
import { downtimeMinutes, fmt, groupBy, readingTrend, type DowntimeRec } from "@/lib/metrics";

export const metadata = { title: "Predictive Maintenance" };
type Row = Record<string, any>;

export default async function Maintenance({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const d = await loadData(ctx, {});
  const { data: rd } = await ctx.supabase.from("equipment_readings").select("equipment_id,metric,value,unit,recorded_at").eq("organization_id", ctx.org.id).order("recorded_at").limit(20000);
  const readings = (rd ?? []) as Row[];
  const dtBy = groupBy(d.downtime as unknown as (DowntimeRec & { equipment_id: string })[], (x) => x.equipment_id);
  const mBy = groupBy(d.maintenanceRecords, (x) => x.equipment_id);
  const tBy = groupBy(d.maintenanceTasks.filter((t) => ["open", "in_progress"].includes(t.status)), (t) => t.equipment_id);
  const rBy = groupBy(readings, (r) => r.equipment_id);
  const now = Date.now();

  const rows = d.equipment.map((e) => {
    const dts = (dtBy[e.id] ?? []).filter((x) => !x.planned);
    const ms = (mBy[e.id] ?? []).map((m) => new Date(m.performed_at).getTime()).sort((a, b) => a - b);
    const last = ms.length ? ms[ms.length - 1] : null;
    const intervals = ms.slice(1).map((t, i) => (t - ms[i]) / 86400000);
    const trends = Object.entries(groupBy(rBy[e.id] ?? [], (r) => r.metric)).map(([metric, rs]) => ({ metric, unit: rs[0]?.unit, t: readingTrend(rs.map((r) => Number(r.value))) })).filter((x) => x.t);
    const open = (tBy[e.id] ?? []).length;
    // Attention score is a transparent sort key, not a probability: events + overdue tasks + sizeable reading drift.
    const overdue = (tBy[e.id] ?? []).filter((t) => t.due_date && new Date(t.due_date).getTime() < now).length;
    const drift = trends.filter((x) => Math.abs(x.t!.changePct) >= 15).length;
    return { e, events: dts.length, minutes: downtimeMinutes(dts), last, intervalDays: intervals.length >= 2 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null, open, overdue, trends, drift, score: dts.length + overdue * 2 + drift * 2 };
  }).sort((a, b) => b.score - a.score);

  return (
    <>
      <PageHeader title="Predictive Maintenance" subtitle="Equipment ranked by recorded evidence: unplanned downtime, overdue tasks and drift in uploaded readings. These are observations and historical patterns — not failure forecasts. Any inspection or intervention requires qualified human review." />
      {!d.equipment.length ? <Empty title="No equipment registered" body="Register equipment and upload downtime, maintenance and reading history." href="/app/equipment" cta="Go to Equipment" /> : (
        <Section title="Equipment attention list" note="Sort key = unplanned events + 2×overdue tasks + 2×readings drifting ≥15%">
          <div className="overflow-x-auto"><table className="w-full min-w-[760px]">
            <thead><tr>{["Equipment", "Unplanned events", "Downtime (min)", "Last maintenance", "Typical interval", "Open tasks", "Reading drift (first vs last third)"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy/5">{rows.map((r) => (
              <tr key={r.e.id} className={r.score >= 4 ? "bg-amber/10" : ""}>
                <td className="td font-medium"><Link className="underline" href={`/app/digital-twin?equipment=${r.e.id}`}>{r.e.name}</Link> <span className="text-xs text-slate">{r.e.code}</span></td>
                <td className="td">{r.events}</td><td className="td">{fmt(r.minutes)}</td>
                <td className="td">{r.last ? `${Math.round((now - r.last) / 86400000)} d ago` : <span className="text-slate">no record</span>}</td>
                <td className="td">{r.intervalDays ? `${Math.round(r.intervalDays)} d (recorded)` : <span className="text-slate">insufficient history</span>}</td>
                <td className="td">{r.open}{r.overdue ? <> <Badge>high</Badge></> : null}</td>
                <td className="td text-xs">{r.trends.length ? r.trends.map((x) => <div key={x.metric}>{x.metric}: {x.t!.changePct > 0 ? "+" : ""}{x.t!.changePct.toFixed(1)}%</div>) : <span className="text-slate">no readings</span>}</td>
              </tr>))}</tbody></table></div>
        </Section>
      )}
      <EntityPage entityKey="maintenance_tasks" searchParams={sp} title="Maintenance tasks" />
    </>
  );
}
