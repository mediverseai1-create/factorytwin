"use client";
import { useState } from "react";

const num = (v: string) => Math.max(0, Number(v) || 0);

export function RoiCalculator() {
  const [hours, setHours] = useState("20");
  const [cost, setCost] = useState("2000");
  const [pct, setPct] = useState("5");
  const monthly = num(hours) * num(cost);
  const avoided = monthly * (num(pct) / 100);
  const field = "w-full rounded-lg border border-white/20 bg-navy px-3 py-2 text-ivory outline-none focus:border-amber";
  return (
    <div className="grid gap-6 rounded-2xl border border-white/10 bg-charcoal/60 p-6 md:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <label className="block text-sm">Unplanned downtime hours per month (all lines)
          <input className={field} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} /></label>
        <label className="block text-sm">Your cost per hour of downtime (USD)
          <input className={field} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></label>
        <label className="block text-sm">Reduction you would consider realistic (%)
          <input className={field} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></label>
      </div>
      <div className="flex flex-col justify-center rounded-xl bg-navy p-5">
        <p className="text-sm text-ivory/70">Current monthly cost of unplanned downtime</p>
        <p className="font-display text-3xl font-bold text-ivory">${monthly.toLocaleString("en-US")}</p>
        <p className="mt-4 text-sm text-ivory/70">Value of a {num(pct)}% reduction</p>
        <p className="font-display text-3xl font-bold text-amber">${Math.round(avoided).toLocaleString("en-US")}<span className="text-base font-normal text-ivory/60"> / month</span></p>
        <p className="mt-4 text-xs text-ivory/50">This calculator multiplies the numbers you enter. FactoryTwin does not promise any specific reduction; use your own assumptions and your own cost data.</p>
      </div>
    </div>
  );
}
