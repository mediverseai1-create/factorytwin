import Link from "next/link";
import { BarsChart, TrendChart } from "@/components/charts";
import { EntityPage } from "@/components/entity-page";
import { FilterBar } from "@/components/filter-bar";
import { Kpi, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { kpis, loadData, parseFilters } from "@/lib/data";
import { KPI_DEFINITIONS, dailySeries, fmt, groupBy, pct } from "@/lib/metrics";

export const metadata = { title: "Quality & Waste" };

export default async function Quality({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const tab = sp.tab === "scrap" ? "scrap" : "inspections";
  const d = await loadData(ctx, f);
  const k = kpis(d);
  const reasons = Object.entries(groupBy(d.scrap, (r) => r.reason ?? "No reason recorded")).map(([name, rs]) => ({ name, quantity: rs.reduce((a, r) => a + Number(r.quantity), 0) })).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
  const batches = d.inspections.slice(-12).map((i) => ({ name: i.batch_no ?? new Date(i.inspected_at).toLocaleDateString(), defectRate: i.sample_size ? +((Number(i.defects_found) / Number(i.sample_size)) * 100).toFixed(2) : null }));
  return (
    <>
      <PageHeader title="Quality & Waste" subtitle="Inspection results, defect rates and scrap. Patterns here suggest areas to investigate; they are not confirmed root causes." />
      <FilterBar filters={f} factories={d.factories} lines={d.lines} shifts={false} />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Kpi label="Inspections" value={fmt(k.inspectionCount)} />
        <Kpi label="Defect rate (sampled)" value={pct(k.defectRate, 2)} hint="defects ÷ sample size" />
        <Kpi label="First-pass quality" value={pct(k.quality)} def={KPI_DEFINITIONS.quality} />
        <Kpi label="Scrap rate" value={pct(k.scrapRate, 2)} def={KPI_DEFINITIONS.scrapRate} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Defect rate by recent batch (%)"><BarsChart data={batches.filter((b) => b.defectRate !== null)} keys={["defectRate"]} /></Section>
        <Section title="Scrap by recorded reason"><BarsChart data={reasons} keys={["quantity"]} /></Section>
      </div>
      <Section title="Scrap quantity per day"><TrendChart data={dailySeries(d.scrap, (r) => Number(r.quantity))} label="Scrap" /></Section>
      <div className="mb-4 flex gap-2">
        <Link href="?tab=inspections" className={tab === "inspections" ? "btn-dark" : "btn-line"}>Inspections</Link>
        <Link href="?tab=scrap" className={tab === "scrap" ? "btn-dark" : "btn-line"}>Scrap records</Link>
      </div>
      <EntityPage entityKey={tab === "scrap" ? "scrap_records" : "quality_inspections"} searchParams={sp} />
    </>
  );
}
