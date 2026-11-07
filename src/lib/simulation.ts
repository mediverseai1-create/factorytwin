/**
 * Deterministic what-if capacity simulation. No AI involved: Gemini may only narrate the output.
 * Model: each line produces `capacityPerHour × hoursPerDay × availability` units/day.
 * Open orders on a line are processed sequentially by priority (1 = most urgent) then due date.
 * It is a planning aid under stated assumptions — not a prediction of real-world results.
 */
export type SimLine = { id: string; name: string; capacityPerHour: number; availability: number };
export type SimOrder = { id: string; orderNo: string; lineId: string | null; remaining: number; dueInDays: number | null; priority: number };

export type ScenarioType =
  | "demand_increase" | "line_unavailable" | "availability_change" | "maintenance_window" | "capacity_change" | "quantity_change";

export type Scenario = {
  type: ScenarioType;
  percent?: number;      // demand_increase, availability_change (negative = reduction), capacity_change, quantity_change
  lineId?: string;       // line_unavailable, availability_change, maintenance_window (omit = all lines)
  days?: number;         // line_unavailable / maintenance_window: duration in days of lost production
  hoursPerDay: number;
};

export type LineOutcome = { lineId: string; name: string; unitsPerDay: number; demand: number; daysNeeded: number | null; utilization: number | null };
export type OrderOutcome = { orderId: string; orderNo: string; lineId: string | null; completionDays: number | null; dueInDays: number | null; late: boolean | null; slackDays: number | null };
export type SimState = { lines: LineOutcome[]; orders: OrderOutcome[]; lateCount: number; unassigned: number };
export type SimResult = { baseline: SimState; scenario: SimState; deltas: { lateOrders: number; totalDemand: number; totalCapacityPerDay: number }; assumptions: string[]; limitations: string[] };

function applyScenario(lines: SimLine[], orders: SimOrder[], s: Scenario) {
  const pctF = 1 + (s.percent ?? 0) / 100;
  const affected = (id: string) => !s.lineId || s.lineId === id;
  let outLines = lines.map((l) => ({ ...l, lostDays: 0 }));
  let outOrders = orders.map((o) => ({ ...o }));
  switch (s.type) {
    case "demand_increase": outOrders = outOrders.map((o) => ({ ...o, remaining: o.remaining * pctF })); break;
    case "quantity_change": outOrders = outOrders.map((o) => ({ ...o, remaining: o.remaining * pctF })); break;
    case "capacity_change": outLines = outLines.map((l) => (affected(l.id) ? { ...l, capacityPerHour: l.capacityPerHour * pctF } : l)); break;
    case "availability_change": outLines = outLines.map((l) => (affected(l.id) ? { ...l, availability: Math.min(1, Math.max(0, l.availability * pctF)) } : l)); break;
    case "line_unavailable":
    case "maintenance_window": outLines = outLines.map((l) => (affected(l.id) ? { ...l, lostDays: Math.max(0, s.days ?? 0) } : l)); break;
  }
  return { lines: outLines, orders: outOrders };
}

function run(lines: (SimLine & { lostDays?: number })[], orders: SimOrder[], hoursPerDay: number): SimState {
  const lineOut: LineOutcome[] = [];
  const orderOut: OrderOutcome[] = [];
  for (const l of lines) {
    const upd = l.capacityPerHour * hoursPerDay * l.availability;
    const lost = l.lostDays ?? 0;
    const mine = orders.filter((o) => o.lineId === l.id).sort((a, b) => a.priority - b.priority || (a.dueInDays ?? 1e9) - (b.dueInDays ?? 1e9));
    let cumulative = 0;
    for (const o of mine) {
      cumulative += o.remaining;
      // Production is unavailable for the first `lost` days, then proceeds at upd units/day.
      const completion = upd > 0 ? lost + cumulative / upd : null;
      const late = completion === null ? true : o.dueInDays === null ? null : completion > o.dueInDays;
      orderOut.push({ orderId: o.id, orderNo: o.orderNo, lineId: l.id, completionDays: completion, dueInDays: o.dueInDays, late, slackDays: completion !== null && o.dueInDays !== null ? o.dueInDays - completion : null });
    }
    const demand = cumulative;
    const daysNeeded = upd > 0 ? lost + demand / upd : demand > 0 ? null : 0;
    const horizon = Math.max(...mine.map((o) => o.dueInDays ?? 0), 0);
    const avail = upd * Math.max(horizon - lost, 0);
    lineOut.push({ lineId: l.id, name: l.name, unitsPerDay: upd, demand, daysNeeded, utilization: avail > 0 ? demand / avail : null });
  }
  const unassigned = orders.filter((o) => !o.lineId || !lines.some((l) => l.id === o.lineId));
  return { lines: lineOut, orders: orderOut, lateCount: orderOut.filter((o) => o.late).length, unassigned: unassigned.length };
}

export function simulate(lines: SimLine[], orders: SimOrder[], s: Scenario): SimResult {
  const baseline = run(lines, orders, s.hoursPerDay);
  const sc = applyScenario(lines, orders, s);
  const scenario = run(sc.lines, sc.orders, s.hoursPerDay);
  const cap = (st: SimState) => st.lines.reduce((a, l) => a + l.unitsPerDay, 0);
  const dem = (st: SimState) => st.lines.reduce((a, l) => a + l.demand, 0);
  return {
    baseline, scenario,
    deltas: { lateOrders: scenario.lateCount - baseline.lateCount, totalDemand: dem(scenario) - dem(baseline), totalCapacityPerDay: cap(scenario) - cap(baseline) },
    assumptions: [
      `${s.hoursPerDay} productive hours per day on every line.`,
      "Line availability = historical run ÷ planned minutes from your production records.",
      "Open orders run sequentially on their assigned line, by priority then due date.",
      "Only orders assigned to a line are simulated; unassigned orders are counted but not scheduled.",
    ],
    limitations: [
      "Simulation output is a planning estimate under the assumptions above, not a guaranteed result.",
      "Changeovers, material shortages, labour limits and unplanned breakdowns are not modelled.",
      "It does not read from or write to live schedules or machinery.",
    ],
  };
}
