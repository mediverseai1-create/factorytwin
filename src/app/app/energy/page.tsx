import { BarsChart, TrendChart } from "@/components/charts";
import { EntityPage } from "@/components/entity-page";
import { FilterBar } from "@/components/filter-bar";
import { Empty, Kpi, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { kpis, loadData, parseFilters, series } from "@/lib/data";
import { KPI_DEFINITIONS, energyIntensity, fmt, groupBy } from "@/lib/metrics";

export const metadata = { title: "Energy Intelligence" };

export default async function Energy({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const d = await loadData(ctx, f);
  const k = kpis(d);
  const lineName = new Map(d.lines.map((l) => [l.id, l.name]));
  const byLine = Object.entries(groupBy(d.energy, (r) => r.line_id)).map(([id, rs]) => ({ name: lineName.get(id) ?? "Unassigned", kwh: Math.round(rs.reduce((a, r) => a + Number(r.kwh), 0)), intensity: energyIntensity(rs) }));
  const byShift = Object.entries(groupBy(d.energy, (r) => r.shift)).map(([name, rs]) => ({ name, kwh: Math.round(rs.reduce((a, r) => a + Number(r.kwh), 0)) }));
  return (
    <>
      <PageHeader title="Energy Intelligence" subtitle="Based only on uploaded energy records. Values are totals for the recorded periods, not live meter readings." />
      <FilterBar filters={f} factories={d.factories} lines={d.lines} />
      {!d.energy.length ? <Empty title="No energy records" body="Import energy consumption records (Wh, kWh, MWh or GJ are converted to kWh; the original value is kept)." href="/app/data" cta="Import data" /> : (<>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Kpi label="Total energy" value={`${fmt(k.energyKwh)} kWh`} />
          <Kpi label="Energy intensity" value={k.energyIntensity === null ? "—" : `${k.energyIntensity.toFixed(3)} kWh/unit`} hint={k.energyIntensity === null ? "Records need units produced" : undefined} def={KPI_DEFINITIONS.energyIntensity} />
          <Kpi label="Records" value={fmt(d.energy.length)} />
        </div>
        <Section title="Daily energy (kWh)"><TrendChart data={series(d).energy} label="kWh" /></Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Consumption by line (kWh)"><BarsChart data={byLine} keys={["kwh"]} /></Section>
          <Section title="Consumption by shift (kWh)"><BarsChart data={byShift} keys={["kwh"]} /></Section>
        </div>
        <Section title="Energy intensity by line (kWh/unit)">
          <BarsChart data={byLine.filter((l) => l.intensity !== null).map((l) => ({ name: l.name, intensity: +l.intensity!.toFixed(3) }))} keys={["intensity"]} />
        </Section>
      </>)}
      <EntityPage entityKey="energy_records" searchParams={sp} title="Energy records" />
    </>
  );
}
