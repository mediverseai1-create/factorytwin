/**
 * Deterministic operational KPIs. Every function returns null when the inputs cannot support the metric,
 * so the UI shows "insufficient data" instead of an invented number.
 */
export type ProdRec = {
  line_id?: string | null; equipment_id?: string | null; recorded_at: string; shift?: string | null;
  units_produced: number; units_good?: number | null; planned_minutes?: number | null;
  run_minutes?: number | null; ideal_cycle_seconds?: number | null;
};
export type DowntimeRec = {
  line_id?: string | null; equipment_id?: string | null; started_at: string; duration_minutes: number;
  reason?: string | null; planned?: boolean | null;
};

export const KPI_DEFINITIONS: Record<string, string> = {
  output: "Sum of units_produced across the selected production records.",
  availability: "Run minutes ÷ planned production minutes (records with both values).",
  performance: "(Units produced × ideal cycle seconds ÷ 60) ÷ run minutes, capped at 100% (records with all three values).",
  quality: "Good units ÷ units produced (records that report good units).",
  oee: "Availability × Performance × Quality. Shown only when all three components can be computed.",
  utilization: "Run minutes ÷ planned minutes. Identical to availability in this model; shown per line/equipment.",
  throughput: "Units produced per run hour (run minutes > 0).",
  downtime: "Sum of downtime_events.duration_minutes as recorded (planned and unplanned reported separately).",
  scrapRate: "Scrap quantity ÷ (units produced + scrap quantity).",
  energyIntensity: "kWh ÷ units produced, for energy records that report units produced.",
  mtbf: "Operating minutes between unplanned downtime events: planned minutes ÷ unplanned event count. Needs ≥2 events.",
  mttr: "Mean duration (min) of unplanned downtime events. Needs ≥1 event.",
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

export function sumOutput(recs: ProdRec[]) {
  return recs.length ? sum(recs.map((r) => r.units_produced)) : null;
}
export function availability(recs: ProdRec[]) {
  const rs = recs.filter((r) => num(r.planned_minutes) && r.planned_minutes! > 0 && num(r.run_minutes) !== null);
  if (!rs.length) return null;
  return sum(rs.map((r) => r.run_minutes!)) / sum(rs.map((r) => r.planned_minutes!));
}
export function performance(recs: ProdRec[]) {
  const rs = recs.filter((r) => num(r.run_minutes) && r.run_minutes! > 0 && num(r.ideal_cycle_seconds) && r.ideal_cycle_seconds! > 0);
  if (!rs.length) return null;
  const ideal = sum(rs.map((r) => (r.units_produced * r.ideal_cycle_seconds!) / 60));
  return Math.min(1, ideal / sum(rs.map((r) => r.run_minutes!)));
}
export function quality(recs: ProdRec[]) {
  const rs = recs.filter((r) => num(r.units_good) !== null);
  const total = sum(rs.map((r) => r.units_produced));
  if (!rs.length || total <= 0) return null;
  return sum(rs.map((r) => r.units_good!)) / total;
}
export function oee(recs: ProdRec[]) {
  const a = availability(recs), p = performance(recs), q = quality(recs);
  return a === null || p === null || q === null ? null : a * p * q;
}
export function throughputPerHour(recs: ProdRec[]) {
  const rs = recs.filter((r) => num(r.run_minutes) && r.run_minutes! > 0);
  if (!rs.length) return null;
  return sum(rs.map((r) => r.units_produced)) / (sum(rs.map((r) => r.run_minutes!)) / 60);
}
export function downtimeMinutes(evts: DowntimeRec[], planned?: boolean) {
  const e = planned === undefined ? evts : evts.filter((d) => !!d.planned === planned);
  return sum(e.map((d) => d.duration_minutes));
}
export function scrapRate(scrapQty: number, produced: number) {
  const d = produced + scrapQty;
  return d > 0 ? scrapQty / d : null;
}
export function energyIntensity(recs: { kwh: number; units_produced?: number | null }[]) {
  const rs = recs.filter((r) => num(r.units_produced) && r.units_produced! > 0);
  if (!rs.length) return null;
  return sum(rs.map((r) => r.kwh)) / sum(rs.map((r) => r.units_produced!));
}
export function mtbfMttr(evts: DowntimeRec[], plannedMinutes: number | null) {
  const u = evts.filter((e) => !e.planned);
  return {
    mtbf: u.length >= 2 && plannedMinutes && plannedMinutes > 0 ? plannedMinutes / u.length : null,
    mttr: u.length ? sum(u.map((e) => e.duration_minutes)) / u.length : null,
    events: u.length,
  };
}

export function groupBy<T>(xs: T[], key: (x: T) => string | null | undefined): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const x of xs) (out[key(x) ?? "unassigned"] ||= []).push(x);
  return out;
}
/** Downtime Pareto by recorded reason (descending). */
export function downtimePareto(evts: DowntimeRec[]) {
  const g = groupBy(evts, (e) => e.reason?.trim() || "No reason recorded");
  const rows = Object.entries(g).map(([reason, es]) => ({ reason, minutes: downtimeMinutes(es), events: es.length }));
  return rows.sort((a, b) => b.minutes - a.minutes);
}
/** Equipment with ≥ `min` unplanned downtime events — "repeated" is a recorded pattern, not a prediction. */
export function repeatedDowntime(evts: DowntimeRec[], min = 3) {
  const g = groupBy(evts.filter((e) => !e.planned && e.equipment_id), (e) => e.equipment_id);
  return Object.entries(g)
    .filter(([, es]) => es.length >= min)
    .map(([equipment_id, es]) => ({ equipment_id, events: es.length, minutes: downtimeMinutes(es) }))
    .sort((a, b) => b.events - a.events);
}
export function dailySeries<T extends { recorded_at?: string; started_at?: string }>(rows: T[], value: (r: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const d = (r.recorded_at ?? r.started_at ?? "").slice(0, 10);
    if (d) m.set(d, (m.get(d) ?? 0) + value(r));
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}
/** Simple reading-trend indicator: compares mean of last third vs first third. Descriptive only. */
export function readingTrend(values: number[]) {
  if (values.length < 6) return null;
  const k = Math.floor(values.length / 3);
  const first = sum(values.slice(0, k)) / k, last = sum(values.slice(-k)) / k;
  if (first === 0) return null;
  return { first, last, changePct: ((last - first) / Math.abs(first)) * 100 };
}

export const pct = (v: number | null, d = 1) => (v === null ? "—" : `${(v * 100).toFixed(d)}%`);
export const fmt = (v: number | null, d = 0) => (v === null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d }));
