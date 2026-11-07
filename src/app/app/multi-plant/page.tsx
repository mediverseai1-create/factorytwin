import { BarsChart } from "@/components/charts";
import { Empty, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { fmt, pct } from "@/lib/metrics";
import { factoryComparison } from "@/lib/reports";

export const metadata = { title: "Multi-Plant Performance" };

export default async function MultiPlant() {
  const ctx = await requireCtx();
  const rows = await factoryComparison(ctx);
  return (
    <>
      <PageHeader title="Multi-Plant Performance" subtitle="Compare facilities on the same definitions. Access follows organization membership; data from other organizations is never visible." />
      {rows.length < 2 ? <Empty title="Add a second factory to compare" body="Comparisons appear once two or more factories have records." href="/app/factories" cta="Manage factories" /> : (<>
        <Section title="Factory comparison">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead><tr>{["Factory", "Output", "OEE", "Availability", "Downtime (h)", "Scrap rate", "Energy kWh/unit", "Open orders"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy/5">{rows.map((f) => <tr key={f.id}><td className="td font-medium">{f.name}</td><td className="td">{fmt(f.output)}</td><td className="td">{pct(f.oee)}</td><td className="td">{pct(f.availability)}</td><td className="td">{f.downtimeMin === null ? "—" : fmt(f.downtimeMin / 60, 1)}</td><td className="td">{pct(f.scrapRate, 2)}</td><td className="td">{f.energyIntensity === null ? "—" : f.energyIntensity.toFixed(3)}</td><td className="td">{f.openOrders}</td></tr>)}</tbody></table></div>
          <p className="mt-2 text-xs text-slate">Differences may reflect different products, data coverage or recording practices; compare with care.</p>
        </Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Output"><BarsChart data={rows.map((f) => ({ name: f.name, units: f.output }))} keys={["units"]} /></Section>
          <Section title="Recorded downtime (h)"><BarsChart data={rows.map((f) => ({ name: f.name, hours: f.downtimeMin === null ? null : +(f.downtimeMin / 60).toFixed(1) }))} keys={["hours"]} /></Section>
        </div>
      </>)}
    </>
  );
}
