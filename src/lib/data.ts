import type { Ctx } from "@/lib/ctx";
import {
  availability, dailySeries, downtimeMinutes, downtimePareto, energyIntensity, mtbfMttr, oee, performance, quality,
  repeatedDowntime, scrapRate, sumOutput, throughputPerHour, groupBy, type DowntimeRec, type ProdRec,
} from "@/lib/metrics";
import { simulate, type SimLine, type SimOrder } from "@/lib/simulation";

export type Filters = { factory?: string; line?: string; from?: string; to?: string; shift?: string };

type Row = any;

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const g = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  return { factory: g("factory"), line: g("line"), from: g("from"), to: g("to"), shift: g("shift") };
}

export async function loadData(ctx: Ctx, f: Filters) {
  const s = ctx.supabase, org = ctx.org.id;
  const scope = (q: any, withLine = true): any => {
    let r = q.eq("organization_id", org);
    if (f.factory) r = r.eq("factory_id", f.factory);
    if (withLine && f.line) r = r.eq("line_id", f.line);
    return r;
  };
  const range = (q: any, col: string) => {
    if (f.from) q = q.gte(col, f.from);
    if (f.to) q = q.lte(col, f.to + "T23:59:59");
    return q;
  };
  const [factories, lines, equipment, prod, down, energy, scrap, orders, mtasks, mrecs, insp] = await Promise.all([
    s.from("factories").select("*").eq("organization_id", org).order("name"),
    scope(s.from("production_lines").select("*")).order("name"),
    scope(s.from("equipment").select("*")).order("name"),
    range(scope(s.from("production_records").select("*")), "recorded_at").order("recorded_at").limit(50000),
    range(scope(s.from("downtime_events").select("*")), "started_at").order("started_at").limit(50000),
    range(scope(s.from("energy_records").select("*")), "recorded_at").order("recorded_at").limit(50000),
    range(scope(s.from("scrap_records").select("*")), "recorded_at").order("recorded_at").limit(50000),
    scope(s.from("production_orders").select("*")).order("due_date"),
    s.from("maintenance_tasks").select("*").eq("organization_id", org).order("due_date"),
    s.from("maintenance_records").select("*").eq("organization_id", org).order("performed_at", { ascending: false }).limit(2000),
    range(scope(s.from("quality_inspections").select("*")), "inspected_at").order("inspected_at").limit(20000),
  ]);
  let production = (prod.data ?? []) as Row[];
  if (f.shift) production = production.filter((r) => r.shift === f.shift);
  return {
    factories: (factories.data ?? []) as Row[], lines: (lines.data ?? []) as Row[], equipment: (equipment.data ?? []) as Row[],
    production, downtime: (down.data ?? []) as Row[], energy: (energy.data ?? []) as Row[], scrap: (scrap.data ?? []) as Row[],
    orders: (orders.data ?? []) as Row[], maintenanceTasks: (mtasks.data ?? []) as Row[], maintenanceRecords: (mrecs.data ?? []) as Row[],
    inspections: (insp.data ?? []) as Row[],
  };
}
export type Data = Awaited<ReturnType<typeof loadData>>;

export function kpis(d: Data) {
  const p = d.production as unknown as ProdRec[];
  const dt = d.downtime as unknown as DowntimeRec[];
  const produced = sumOutput(p);
  const scrapQty = d.scrap.reduce((a, r) => a + Number(r.quantity), 0);
  const insp = d.inspections;
  const sampled = insp.reduce((a, r) => a + Number(r.sample_size ?? 0), 0);
  const defects = insp.reduce((a, r) => a + Number(r.defects_found ?? 0), 0);
  return {
    output: produced, availability: availability(p), performance: performance(p), quality: quality(p), oee: oee(p), throughput: throughputPerHour(p),
    downtimeMin: dt.length ? downtimeMinutes(dt) : null, unplannedMin: dt.length ? downtimeMinutes(dt, false) : null,
    scrapRate: d.scrap.length && produced !== null ? scrapRate(scrapQty, produced) : null,
    defectRate: sampled > 0 ? defects / sampled : null,
    energyKwh: d.energy.length ? d.energy.reduce((a, r) => a + Number(r.kwh), 0) : null,
    energyIntensity: energyIntensity(d.energy),
    openOrders: d.orders.filter((o) => ["open", "in_progress"].includes(o.status)).length,
    openMaintenance: d.maintenanceTasks.filter((t) => ["open", "in_progress"].includes(t.status)).length,
    inspectionCount: insp.length,
  };
}

export function perLine(d: Data) {
  const byLine = groupBy(d.production as unknown as (ProdRec & { line_id: string })[], (r) => r.line_id);
  const dtByLine = groupBy(d.downtime as unknown as DowntimeRec[], (r) => r.line_id);
  return d.lines.map((l) => {
    const recs = byLine[l.id] ?? [];
    const dts = dtByLine[l.id] ?? [];
    const planned = recs.reduce((a, r) => a + (r.planned_minutes ?? 0), 0);
    return {
      id: l.id as string, name: l.name as string, factoryId: l.factory_id as string, capacityPerHour: l.capacity_per_hour as number | null,
      records: recs.length, output: sumOutput(recs), availability: availability(recs), oee: oee(recs), throughput: throughputPerHour(recs),
      downtimeMin: dts.length ? downtimeMinutes(dts) : null, ...mtbfMttr(dts, planned || null),
    };
  });
}

export function series(d: Data) {
  return {
    output: dailySeries(d.production as Row[], (r) => Number(r.units_produced)),
    downtime: dailySeries(d.downtime as Row[], (r) => Number(r.duration_minutes)),
    energy: dailySeries(d.energy as Row[], (r) => Number(r.kwh)),
  };
}

/** Builds the simulator baseline from stored data (lines with observed availability + open orders). */
export function simInputs(d: Data): { lines: SimLine[]; orders: SimOrder[]; missing: string[] } {
  const missing: string[] = [];
  const pl = perLine(d);
  const lines: SimLine[] = [];
  for (const l of d.lines) {
    const m = pl.find((x) => x.id === l.id)!;
    if (!l.capacity_per_hour) { missing.push(`${l.name}: nominal capacity (units/hour) is not recorded`); continue; }
    if (m.availability === null) missing.push(`${l.name}: no availability history — assumed 100%`);
    lines.push({ id: l.id, name: l.name, capacityPerHour: Number(l.capacity_per_hour), availability: m.availability ?? 1 });
  }
  const today = Date.now();
  const orders: SimOrder[] = d.orders.filter((o) => ["open", "in_progress"].includes(o.status)).map((o) => ({
    id: o.id, orderNo: o.order_no, lineId: o.line_id, remaining: Math.max(0, Number(o.quantity) - Number(o.quantity_done ?? 0)),
    dueInDays: o.due_date ? (new Date(o.due_date).getTime() - today) / 86400000 : null, priority: o.priority ?? 3,
  }));
  if (orders.some((o) => !o.lineId)) missing.push("Some open orders have no assigned line and cannot be simulated");
  return { lines, orders, missing };
}

/** Compact, citeable factory context for Gemini. All numbers are deterministic application-side calculations. */
export function aiContext(d: Data) {
  const k = kpis(d);
  const pl = perLine(d);
  const sim = simInputs(d);
  const base = simulate(sim.lines, sim.orders, { type: "demand_increase", percent: 0, hoursPerDay: 8 }).baseline;
  const eqName = new Map(d.equipment.map((e) => [e.id, `${e.name} (${e.code})`]));
  const lineName = new Map(d.lines.map((l) => [l.id, l.name]));
  return {
    counts: { factories: d.factories.length, lines: d.lines.length, equipment: d.equipment.length, productionRecords: d.production.length, downtimeEvents: d.downtime.length, openOrders: k.openOrders },
    kpis: k, kpiDefinitions: "OEE = availability × performance × quality; null means insufficient data.",
    factories: d.factories.map((f) => ({ name: f.name, location: f.location })),
    lines: pl.map(({ id, factoryId, ...x }) => x),
    downtimePareto: downtimePareto(d.downtime as unknown as DowntimeRec[]).slice(0, 8),
    repeatedDowntime: repeatedDowntime(d.downtime as unknown as DowntimeRec[]).map((r) => ({ equipment: eqName.get(r.equipment_id) ?? r.equipment_id, events: r.events, minutes: r.minutes })),
    openMaintenance: d.maintenanceTasks.filter((t) => ["open", "in_progress"].includes(t.status)).slice(0, 15).map((t) => ({ title: t.title, equipment: eqName.get(t.equipment_id), due: t.due_date })),
    recentMaintenance: d.maintenanceRecords.slice(0, 15).map((m) => ({ equipment: eqName.get(m.equipment_id), when: m.performed_at, type: m.type, description: m.description })),
    ordersBaseline: base.orders.map((o) => ({ order: o.orderNo, completionDays: o.completionDays && +o.completionDays.toFixed(1), dueInDays: o.dueInDays && +o.dueInDays.toFixed(1), late: o.late })),
    ordersUnassigned: base.unassigned, simulationDataGaps: sim.missing,
    equipmentStatus: d.equipment.slice(0, 60).map((e) => ({ name: e.name, code: e.code, line: lineName.get(e.line_id), recordedStatus: e.status, statusRecordedAt: e.status_recorded_at, operatingHours: e.operating_hours })),
  };
}
