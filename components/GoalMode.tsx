"use client";

import { useMemo, useState } from "react";
import { gbp, requiredMonthlyInvestment, timeToGoal } from "@/lib/finance";

export default function GoalMode() {
  const [mode, setMode] = useState<"monthly" | "time">("monthly");
  const [target, setTarget] = useState(500_000);
  const [years, setYears] = useState(20);
  const [monthly, setMonthly] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [initial, setInitial] = useState(0);
  const [stepUp, setStepUp] = useState(0);

  const required = useMemo(() => requiredMonthlyInvestment(target, years, annualReturn, initial, stepUp), [target, years, annualReturn, initial, stepUp]);
  const months = useMemo(() => timeToGoal(target, monthly, annualReturn, initial, stepUp), [target, monthly, annualReturn, initial, stepUp]);
  const timeLabel = months == null ? "More than 100 years" : `${Math.floor(months / 12)} years ${months % 12} months`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex justify-center"><div className="segmented"><button className={mode === "monthly" ? "active" : ""} onClick={() => setMode("monthly")}>Required monthly amount</button><button className={mode === "time" ? "active" : ""} onClick={() => setMode("time")}>Time to target</button></div></div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel p-5 sm:p-7">
          <p className="eyebrow">Goal calculator</p>
          <h2 className="mt-1 text-2xl font-bold">Work backwards from your target</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label><span className="input-label">Target portfolio</span><div className="number-input-large"><span>£</span><input type="number" value={target} min="1000" step="1000" onChange={(e) => setTarget(Number(e.target.value))}/></div></label>
            {mode === "monthly" ? <label><span className="input-label">Time</span><div className="number-input-large"><input type="number" value={years} min="1" max="50" onChange={(e) => setYears(Number(e.target.value))}/><span>years</span></div></label> : <label><span className="input-label">Monthly investment</span><div className="number-input-large"><span>£</span><input type="number" value={monthly} min="25" onChange={(e) => setMonthly(Number(e.target.value))}/></div></label>}
            <label><span className="input-label">Expected annual return</span><div className="number-input-large"><input type="number" value={annualReturn} min="1" max="20" step="0.1" onChange={(e) => setAnnualReturn(Number(e.target.value))}/><span>%</span></div></label>
            <label><span className="input-label">Initial lump sum</span><div className="number-input-large"><span>£</span><input type="number" value={initial} min="0" step="500" onChange={(e) => setInitial(Number(e.target.value))}/></div></label>
            <label className="sm:col-span-2"><span className="input-label">Annual contribution increase</span><div className="number-input-large"><input type="number" value={stepUp} min="0" max="25" step="0.5" onChange={(e) => setStepUp(Number(e.target.value))}/><span>%</span></div></label>
          </div>
        </section>
        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 p-7 text-white shadow-xl shadow-slate-900/10 sm:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-white/10"/><div className="absolute -right-4 -top-4 h-36 w-36 rounded-full border border-white/10"/>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Illustrative answer</p>
          {mode === "monthly" ? <><h3 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">{gbp.format(required)}</h3><p className="mt-3 text-lg text-slate-300">per month to target {gbp.format(target)} in {years} years</p></> : <><h3 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{timeLabel}</h3><p className="mt-3 text-lg text-slate-300">to target {gbp.format(target)} at {gbp.format(monthly)}/month</p></>}
          <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 text-sm"><div><span className="block text-slate-500">Return assumption</span><strong>{annualReturn.toFixed(1)}%</strong></div><div><span className="block text-slate-500">Annual step-up</span><strong>{stepUp.toFixed(1)}%</strong></div></div>
          <p className="mt-7 text-xs leading-5 text-slate-400">This is a mathematical illustration, not a guarantee. Market returns are uneven and can be negative.</p>
        </section>
      </div>
    </div>
  );
}
