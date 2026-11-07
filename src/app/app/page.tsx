import Link from "next/link";
import { BarsChart, TrendChart } from "@/components/charts";
import { FilterBar } from "@/components/filter-bar";
import { Empty, Kpi, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { kpis, loadData, parseFilters, perLine, series } from "@/lib/data";
import { KPI_DEFINITIONS, fmt, pct } from "@/lib/metrics";

export const metadata = { title: "Overview" };

export default async function Overview({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const filters = parseFilters(await searchParams);
  const d = await loadData(ctx, filters);
  const k = kpis(d);
  const s = series(d);
  const pl = perLine(d);
  const { data: insights } = await ctx.supabase.from("ai_insights").select("id,title,kind,confidence,created_at").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(5);

  const steps = [
    { done: d.factories.length > 0, label: "Register a factory", href: "/app/factories" },
    { done: d.lines.length > 0, label: "Add production lines", href: "/app/production-lines" },
    { done: d.equipment.length > 0, label: "Register equipment", href: "/app/equipment" },
    { done: d.production.length > 0, label: "Upload production records", href: "/app/data" },
  ];
  const hasAnyData = d.production.length + d.downtime.length + d.energy.length > 0;

  return (
    <>
      <PageHeader title="Operations Overview" subtitle="Figures are calculated from the records in your organization. Nothing here is live telemetry unless a connected data source is shown." />
      <FilterBar filters={filters} factories={d.factories} lines={d.lines} />
      {(!hasAnyData || steps.some((x) => !x.done)) && (
        <Section title="Get started" note="Build your factory model">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, i) => (
              <li key={st.label}>
                <Link href={st.href} className={`block rounded-lg border p-3 text-sm ${st.done ? "border-ok/30 bg-ok/5 text-ok" : "border-navy/15 hover:bg-ivory"}`}>
                  <span className="font-semibold">{i + 1}. {st.label}</span><br /><span className="text-xs">{st.done ? "Done" : "To do"}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total output" value={fmt(k.output)} hint="units" def={KPI_DEFINITIONS.output} />
        <Kpi label="OEE" value={pct(k.oee)} hint={k.oee === null ? "Needs planned/run minutes, cycle time & good units" : "availability × performance × quality"} def={KPI_DEFINITIONS.oee} />
        <Kpi label="Availability" value={pct(k.availability)} def={KPI_DEFINITIONS.availability} />
        <Kpi label="Recorded downtime" value={k.downtimeMin === null ? "—" : `${fmt(k.downtimeMin / 60, 1)} h`} hint={k.unplannedMin !== null ? `${fmt(k.unplannedMin / 60, 1)} h unplanned` : undefined} def={KPI_DEFINITIONS.downtime} />
        <Kpi label="Quality (first-pass)" value={pct(k.quality)} def={KPI_DEFINITIONS.quality} />
        <Kpi label="Scrap rate" value={pct(k.scrapRate, 2)} def={KPI_DEFINITIONS.scrapRate} />
        <Kpi label="Energy" value={k.energyKwh === null ? "—" : `${fmt(k.energyKwh)} kWh`} hint={k.energyIntensity !== null ? `${k.energyIntensity.toFixed(3)} kWh/unit` : undefined} def={KPI_DEFINITIONS.energyIntensity} />
        <Kpi label="Open orders · maintenance" value={`${k.openOrders} · ${k.openMaintenance}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Daily output"><TrendChart data={s.output} label="Units" /></Section>
        <Section title="Daily recorded downtime (min)"><TrendChart data={s.downtime} label="Minutes" /></Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Output by production line" note="Selected range">
          <BarsChart data={pl.filter((l) => l.output !== null).map((l) => ({ name: l.name, units: l.output }))} keys={["units"]} />
        </Section>
        <Section title="Latest AI insights" note="AI-generated · requires human review">
          {insights?.length ? (
            <ul className="divide-y divide-navy/10">
              {insights.map((i) => (
                <li key={i.id} className="py-2 text-sm"><span className="font-medium">{i.title}</span> <span className="text-xs text-slate">· {String(i.kind).replace(/_/g, " ")} · {i.confidence} confidence</span></li>
              ))}
            </ul>
          ) : <Empty title="No AI insights yet" body="Run an agent once you have data and its findings will appear here with their evidence." href="/app/agents" cta="Open AI Agents" />}
        </Section>
      </div>
    </>
  );
}
