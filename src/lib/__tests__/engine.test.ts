import { describe, expect, it } from "vitest";
import { availability, oee, performance, quality, downtimePareto, repeatedDowntime, scrapRate, energyIntensity } from "../metrics";
import { simulate } from "../simulation";

const rec = { recorded_at: "2025-01-01", units_produced: 900, units_good: 880, planned_minutes: 480, run_minutes: 400, ideal_cycle_seconds: 20 };

describe("metrics", () => {
  it("computes OEE components", () => {
    expect(availability([rec])).toBeCloseTo(400 / 480);
    expect(performance([rec])).toBeCloseTo(300 / 400);
    expect(quality([rec])).toBeCloseTo(880 / 900);
    expect(oee([rec])).toBeCloseTo((400 / 480) * (300 / 400) * (880 / 900));
  });
  it("returns null without sufficient data", () => {
    expect(oee([{ recorded_at: "x", units_produced: 10 }])).toBeNull();
    expect(availability([])).toBeNull();
    expect(energyIntensity([{ kwh: 5 }])).toBeNull();
  });
  it("builds downtime pareto and repeated-downtime lists", () => {
    const ev = [1, 2, 3].map((i) => ({ started_at: `d${i}`, duration_minutes: 10 * i, reason: "Jam", equipment_id: "e1" }));
    expect(downtimePareto(ev)[0]).toEqual({ reason: "Jam", minutes: 60, events: 3 });
    expect(repeatedDowntime(ev)[0].equipment_id).toBe("e1");
    expect(scrapRate(10, 90)).toBeCloseTo(0.1);
  });
});

describe("simulation", () => {
  const lines = [{ id: "L1", name: "Line 1", capacityPerHour: 100, availability: 0.8 }];
  const orders = [{ id: "o1", orderNo: "A", lineId: "L1", remaining: 1600, dueInDays: 3, priority: 1 }];
  it("baseline: 1600 units at 640/day ≈ 2.5 days", () => {
    const r = simulate(lines, orders, { type: "demand_increase", percent: 0, hoursPerDay: 8 });
    expect(r.baseline.orders[0].completionDays).toBeCloseTo(2.5);
    expect(r.baseline.lateCount).toBe(0);
  });
  it("demand +50% makes the order late", () => {
    const r = simulate(lines, orders, { type: "demand_increase", percent: 50, hoursPerDay: 8 });
    expect(r.scenario.orders[0].late).toBe(true);
    expect(r.deltas.lateOrders).toBe(1);
  });
  it("line outage delays completion by outage days", () => {
    const r = simulate(lines, orders, { type: "line_unavailable", lineId: "L1", days: 1, hoursPerDay: 8 });
    expect(r.scenario.orders[0].completionDays).toBeCloseTo(3.5);
  });
});
