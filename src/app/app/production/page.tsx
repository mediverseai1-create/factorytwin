import { BarsChart, TrendChart } from "@/components/charts";
import { FilterBar } from "@/components/filter-bar";
import { Empty, Kpi, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { kpis, loadData, parseFilters, perLine, series } from "@/lib/data";
import { KPI_DEFINITIONS, availability, fmt, groupBy, oee, pct, sumOutput, throughputPerHour, type ProdRec } from "@/lib/metrics";

export const metadata = { title: "Production Intelligence" };

export default async function Production({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const f = parseFilters(await searchParams);
  const d = await loadData(ctx, f);
  const k = kpis(d), pl = perLine(d), s = series(d);
  const shifts = Object.entries(groupBy(d.production as unknown as ProdRec[], (r) => r.shift)).map(([shift, rs]) => ({
    shift, output: sumOutput(rs), availability: availability(rs), oee: oee(rs), throughput: throughputPerHour(rs),
  }));
  return (
    <>
      <PageHeader title="Production Intelligence" subtitle="Output, throughput and efficiency calculated from production records. Hover a KPI for its definition." />
      <FilterBar filters={f} factories={d.factories} lines={d.lines} />
      {!d.production.length ? <Empty title="No production records in this scope" body="Import production records or shift reports to see output, throughput, OEE and bottlenecks." href="/app/data" cta="Import data" /> : (<>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Output" value={fmt(k.output)} def={KPI_DEFINITIONS.output} />
          <Kpi label="Throughput" value={k.throughput === null ? "—" : `${fmt(k.throughput, 1)}/h`} def={KPI_DEFINITIONS.throughput} />
          <Kpi label="Availability" value={pct(k.availability)} def={KPI_DEFINITIONS.availability} />
          <Kpi label="Performance" value={pct(k.performance)} def={KPI_DEFINITIONS.performance} />
          <Kpi label="OEE" value={pct(k.oee)} def={KPI_DEFINITIONS.oee} />
        </div>
        <Section title="Daily output"><TrendChart data={s.output} label="Units" /></Section>
        <Section title="Line comparison" note="Ranked by recorded throughput; the lowest-availability line is a candidate bottleneck to investigate">
          <div className="overflow-x-auto"><table className="w-full min-w-[560px]"><thead><tr>{["Line", "Output", "Throughput/h", "Nominal capacity/h", "Availability", "OEE"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy/5">{[...pl].sort((a, b) => (b.throughput ?? -1) - (a.throughput ?? -1)).map((l) => (
              <tr key={l.id}><td className="td font-medium">{l.name}</td><td className="td">{fmt(l.output)}</td><td className="td">{fmt(l.throughput, 1)}</td><td className="td">{fmt(l.capacityPerHour)}</td><td className="td">{pct(l.availability)}</td><td className="td">{pct(l.oee)}</td></tr>))}</tbody></table></div>
        </Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Shift comparison"><BarsChart data={shifts.map((x) => ({ name: x.shift, output: x.output }))} keys={["output"]} /></Section>
          <Section title="Production order performance">
            {d.orders.length ? <ul className="divide-y divide-navy/10 text-sm">{d.orders.slice(0, 12).map((o) => (
              <li key={o.id} className="flex justify-between py-1.5"><span>{o.order_no} · {o.product ?? "—"}</span><span>{fmt(Number(o.quantity_done ?? 0))} / {fmt(Number(o.quantity))} ({pct(Number(o.quantity_done ?? 0) / Number(o.quantity), 0)})</span></li>))}</ul>
              : <p className="text-sm text-slate">No production orders recorded.</p>}
          </Section>
        </div>
      </>)}
    </>
  );
}
