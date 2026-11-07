import type { Ctx } from "@/lib/ctx";
import { kpis, loadData, perLine, simInputs, type Data } from "@/lib/data";
import { availability, downtimePareto, energyIntensity, fmt, groupBy, mtbfMttr, pct, repeatedDowntime, sumOutput, type DowntimeRec, type ProdRec } from "@/lib/metrics";
import { simulate } from "@/lib/simulation";

export type Section = { title: string; columns: string[]; rows: (string | number)[][] };
export type ReportContent = { generatedAt: string; organization: string; sections: Section[]; notes: string[] };

export const REPORT_TYPES: Record<string, string> = {
  factory_performance: "Factory performance report", production: "Production report", equipment_utilization: "Equipment utilization report",
  maintenance: "Maintenance report", downtime: "Downtime analysis report", quality: "Quality report", energy: "Energy report",
  planning: "Production planning report", scenario_comparison: "Scenario comparison report", executive_summary: "Executive operational summary",
  multi_plant: "Multi-plant performance report",
};

const NOTE = "Figures are calculated from records stored in FactoryTwin; “—” means insufficient data. Not live telemetry. Recommendations require qualified human review.";

export function kpiRows(d: Data): (string | number)[][] {
  const k = kpis(d);
  return [["Total output (units)", fmt(k.output)], ["Availability", pct(k.availability)], ["Performance", pct(k.performance)], ["Quality", pct(k.quality)], ["OEE", pct(k.oee)],
    ["Recorded downtime (h)", k.downtimeMin === null ? "—" : fmt(k.downtimeMin / 60, 1)], ["Scrap rate", pct(k.scrapRate, 2)], ["Energy (kWh)", fmt(k.energyKwh)],
    ["Energy intensity (kWh/unit)", k.energyIntensity === null ? "—" : k.energyIntensity.toFixed(3)], ["Open orders", k.openOrders], ["Open maintenance tasks", k.openMaintenance]];
}

export async function factoryComparison(ctx: Ctx) {
  const all = await loadData(ctx, {});
  return Promise.all(all.factories.map(async (f) => {
    const d = await loadData(ctx, { factory: f.id });
    const k = kpis(d);
    return { id: f.id as string, name: f.name as string, ...k };
  }));
}

export async function buildReport(ctx: Ctx, type: string, factory?: string): Promise<ReportContent> {
  const d = await loadData(ctx, { factory });
  const k = kpis(d);
  const pl = perLine(d);
  const eq = new Map(d.equipment.map((e) => [e.id, e.name]));
  const sections: Section[] = [];
  const kpiSec: Section = { title: "Key metrics", columns: ["Metric", "Value"], rows: kpiRows(d) };
  const lineSec: Section = { title: "Production lines", columns: ["Line", "Output", "Throughput/h", "Availability", "OEE", "Downtime (min)"], rows: pl.map((l) => [l.name, fmt(l.output), fmt(l.throughput, 1), pct(l.availability), pct(l.oee), fmt(l.downtimeMin)]) };
  const dt = d.downtime as unknown as DowntimeRec[];
  switch (type) {
    case "factory_performance": case "executive_summary": sections.push(kpiSec, lineSec); break;
    case "production": sections.push(kpiSec, lineSec, { title: "By shift", columns: ["Shift", "Output", "Availability"], rows: Object.entries(groupBy(d.production as unknown as ProdRec[], (r) => r.shift)).map(([s, rs]) => [s, fmt(sumOutput(rs)), pct(availability(rs))]) }); break;
    case "equipment_utilization": sections.push({ title: "Equipment utilization", columns: ["Equipment", "Code", "Utilization", "Operating hours", "Recorded status"],
      rows: d.equipment.map((e) => [e.name, e.code, pct(availability(d.production.filter((r) => r.equipment_id === e.id) as unknown as ProdRec[])), fmt(e.operating_hours), e.status]) }); break;
    case "maintenance": sections.push({ title: "Maintenance history", columns: ["Date", "Equipment", "Type", "Description"], rows: d.maintenanceRecords.slice(0, 200).map((m) => [m.performed_at.slice(0, 10), eq.get(m.equipment_id) ?? "—", m.type ?? "—", m.description ?? ""]) },
      { title: "Open tasks", columns: ["Task", "Equipment", "Due", "Status"], rows: d.maintenanceTasks.filter((t) => ["open", "in_progress"].includes(t.status)).map((t) => [t.title, eq.get(t.equipment_id) ?? "—", t.due_date ?? "—", t.status]) }); break;
    case "downtime": sections.push({ title: "Downtime by reason", columns: ["Reason", "Events", "Minutes"], rows: downtimePareto(dt).map((p) => [p.reason, p.events, fmt(p.minutes)]) },
      { title: "Repeated unplanned downtime", columns: ["Equipment", "Events", "Minutes"], rows: repeatedDowntime(dt).map((r) => [eq.get(r.equipment_id) ?? r.equipment_id, r.events, fmt(r.minutes)]) },
      { title: "Reliability", columns: ["MTTR (min)", "Unplanned events"], rows: [[fmt(mtbfMttr(dt, null).mttr), mtbfMttr(dt, null).events]] }); break;
    case "quality": sections.push({ title: "Quality summary", columns: ["Metric", "Value"], rows: [["Inspections", k.inspectionCount], ["Defect rate (sampled)", pct(k.defectRate, 2)], ["First-pass quality", pct(k.quality)], ["Scrap rate", pct(k.scrapRate, 2)]] },
      { title: "Scrap by reason", columns: ["Reason", "Quantity"], rows: Object.entries(groupBy(d.scrap, (r) => r.reason ?? "No reason recorded")).map(([r, rs]) => [r, rs.reduce((a, x) => a + Number(x.quantity), 0)]) }); break;
    case "energy": sections.push({ title: "Energy by line", columns: ["Line", "kWh", "kWh/unit"], rows: Object.entries(groupBy(d.energy, (r) => r.line_id)).map(([id, rs]) => [d.lines.find((l) => l.id === id)?.name ?? "Unassigned", fmt(rs.reduce((a, r) => a + Number(r.kwh), 0)), energyIntensity(rs)?.toFixed(3) ?? "—"]) }); break;
    case "planning": { const s = simInputs(d); const b = simulate(s.lines, s.orders, { type: "demand_increase", percent: 0, hoursPerDay: 8 }).baseline;
      sections.push({ title: "Order outlook (baseline, 8 h/day)", columns: ["Order", "Est. completion (d)", "Due in (d)", "Outlook"], rows: b.orders.map((o) => [o.orderNo, fmt(o.completionDays, 1), fmt(o.dueInDays, 1), o.late === null ? "No due date" : o.late ? "At risk" : "On track"]) },
        { title: "Data gaps", columns: ["Gap"], rows: s.missing.map((m) => [m]) }); break; }
    case "scenario_comparison": { const { data } = await ctx.supabase.from("scenario_definitions").select("name,type,assumptions,scenario_runs(scenario_results(result))").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(20);
      sections.push({ title: "Saved scenarios", columns: ["Scenario", "Type", "Late orders (baseline → scenario)"], rows: (data ?? []).map((s: any) => { const r = s.scenario_runs?.[0]?.scenario_results?.[0]?.result; return [s.name, String(s.type).replace(/_/g, " "), r ? `${r.baseline?.lateCount} → ${r.scenario?.lateCount}` : "—"]; }) }); break; }
    case "multi_plant": { const c = await factoryComparison(ctx);
      sections.push({ title: "Factory comparison", columns: ["Factory", "Output", "OEE", "Downtime (h)", "Scrap rate", "Energy intensity"], rows: c.map((f) => [f.name, fmt(f.output), pct(f.oee), f.downtimeMin === null ? "—" : fmt(f.downtimeMin / 60, 1), pct(f.scrapRate, 2), f.energyIntensity === null ? "—" : f.energyIntensity.toFixed(3)]) }); break; }
  }
  return { generatedAt: new Date().toISOString(), organization: ctx.org.name, sections, notes: [NOTE] };
}

export const toCsv = (c: ReportContent) => c.sections.map((s) => [s.title, s.columns.join(","), ...s.rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n")).join("\n\n");
