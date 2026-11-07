import Link from "next/link";
import { EntityPage } from "@/components/entity-page";
import { Empty, Kpi, PageHeader, Section } from "@/components/ui";
import { requireCtx } from "@/lib/ctx";
import { loadData, simInputs } from "@/lib/data";
import { fmt, pct } from "@/lib/metrics";
import { simulate } from "@/lib/simulation";

export const metadata = { title: "Production Planning" };

export default async function Planning({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const d = await loadData(ctx, {});
  const { lines, orders, missing } = simInputs(d);
  const base = simulate(lines, orders, { type: "demand_increase", percent: 0, hoursPerDay: 8 }).baseline;
  const nameOf = new Map(d.lines.map((l) => [l.id, l.name]));
  return (
    <>
      <PageHeader title="Production Planning" subtitle="Baseline capacity vs. open orders (8 productive hours/day, observed availability). This is a planning estimate — it does not change live schedules.">
        <Link href="/app/simulator" className="btn-primary">Open Scenario Simulator</Link>
      </PageHeader>
      {missing.length > 0 && <div className="mb-4 rounded-lg bg-amber/15 p-3 text-sm text-amber-dark"><b>Data gaps:</b><ul className="list-disc pl-5">{missing.map((m) => <li key={m}>{m}</li>)}</ul></div>}
      {!lines.length || !orders.length ? <Empty title="Not enough data to plan" body="Add production lines with nominal capacity and open production orders assigned to a line." /> : (<>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Kpi label="Open orders simulated" value={String(base.orders.length)} />
          <Kpi label="Projected late orders" value={String(base.lateCount)} hint="completion later than due date" />
          <Kpi label="Unassigned orders" value={String(base.unassigned)} />
        </div>
        <Section title="Line capacity & load">
          <table className="w-full"><thead><tr>{["Line", "Units/day", "Open demand", "Days to clear", "Load vs. window"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy/5">{base.lines.map((l) => <tr key={l.lineId}><td className="td font-medium">{l.name}</td><td className="td">{fmt(l.unitsPerDay)}</td><td className="td">{fmt(l.demand)}</td><td className="td">{fmt(l.daysNeeded, 1)}</td><td className="td">{pct(l.utilization, 0)}</td></tr>)}</tbody></table>
        </Section>
        <Section title="Order delivery outlook" note="Ordered by priority, then due date">
          <table className="w-full"><thead><tr>{["Order", "Line", "Est. completion (days)", "Due in (days)", "Outlook"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-navy/5">{base.orders.map((o) => <tr key={o.orderId}><td className="td font-medium">{o.orderNo}</td><td className="td">{nameOf.get(o.lineId ?? "")}</td><td className="td">{fmt(o.completionDays, 1)}</td><td className="td">{fmt(o.dueInDays, 1)}</td>
              <td className="td">{o.late === null ? "No due date" : o.late ? <span className="font-semibold text-danger">At risk</span> : <span className="text-ok">On track</span>}</td></tr>)}</tbody></table>
        </Section>
      </>)}
      <EntityPage entityKey="production_orders" searchParams={sp} title="Production orders" />
    </>
  );
}
