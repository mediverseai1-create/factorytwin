import { BarsChart, TrendChart } from "@/components/charts";
import { EntityPage } from "@/components/entity-page";
import { FilterBar } from "@/components/filter-bar";
import { Empty, Kpi, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { loadData, parseFilters, series } from "@/lib/data";
import { KPI_DEFINITIONS, downtimeMinutes, downtimePareto, fmt, mtbfMttr, repeatedDowntime, type DowntimeRec } from "@/lib/metrics";

export const metadata = { title: "Downtime Intelligence" };

export default async function Downtime({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const d = await loadData(ctx, f);
  const dt = d.downtime as unknown as DowntimeRec[];
  const pareto = downtimePareto(dt);
  const rep = repeatedDowntime(dt);
  const eq = new Map(d.equipment.map((e) => [e.id, e]));
  const planned = d.production.reduce((a, r) => a + Number(r.planned_minutes ?? 0), 0);
  const m = mtbfMttr(dt, planned || null);
  return (
    <>
      <PageHeader title="Downtime Intelligence" subtitle="Recorded downtime grouped by the reason as entered. Repeated events are recorded patterns — contributing factors need investigation; they are not confirmed causes." />
      <FilterBar filters={f} factories={d.factories} lines={d.lines} shifts={false} />
      {dt.length > 0 ? (<>
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Kpi label="Total recorded" value={`${fmt(downtimeMinutes(dt) / 60, 1)} h`} def={KPI_DEFINITIONS.downtime} />
          <Kpi label="Unplanned" value={`${fmt(downtimeMinutes(dt, false) / 60, 1)} h`} />
          <Kpi label="MTTR" value={m.mttr === null ? "—" : `${fmt(m.mttr, 0)} min`} def={KPI_DEFINITIONS.mttr} />
          <Kpi label="MTBF" value={m.mtbf === null ? "—" : `${fmt(m.mtbf / 60, 1)} h`} def={KPI_DEFINITIONS.mtbf} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Downtime by recorded reason (min)"><BarsChart data={pareto.slice(0, 8).map((p) => ({ name: p.reason, minutes: p.minutes }))} keys={["minutes"]} /></Section>
          <Section title="Daily downtime (min)"><TrendChart data={series(d).downtime} label="Minutes" /></Section>
        </div>
        <Section title="Repeated unplanned downtime" note="3 or more unplanned events on the same equipment">
          {rep.length ? <table className="w-full"><thead><tr>{["Equipment", "Events", "Total minutes", "Suggested next step"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy/5">{rep.map((r) => <tr key={r.equipment_id}><td className="td font-medium">{eq.get(r.equipment_id)?.name ?? r.equipment_id}</td><td className="td">{r.events}</td><td className="td">{fmt(r.minutes)}</td><td className="td text-steel">Review recorded reasons and maintenance history with the maintenance team.</td></tr>)}</tbody></table>
            : <p className="text-sm text-slate">No equipment meets the repeat threshold in this range.</p>}
        </Section>
      </>) : <Empty title="No downtime events in this scope" body="Import downtime reports or log events manually below." href="/app/data" cta="Import data" />}
      <EntityPage entityKey="downtime_events" searchParams={sp} title="Downtime events" />
    </>
  );
}
