"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { ETFSearchResult } from "@/lib/types";
import ProjectionMode from "./ProjectionMode";
import HistoricalMode from "./HistoricalMode";
import GoalMode from "./GoalMode";
import CompareMode from "./CompareMode";
import ExploreETFs from "./ExploreETFs";

type Mode = "projected" | "historical" | "compare" | "goal";

const modes: { key: Mode; label: string; short: string }[] = [
  { key: "projected", label: "Projected Growth", short: "Projection" },
  { key: "historical", label: "Historical ETF Backtest", short: "Backtest" },
  { key: "compare", label: "Compare ETFs", short: "Compare" },
  { key: "goal", label: "Goal Calculator", short: "Goal" },
];

export default function InvestmentApp() {
  const [mode, setMode] = useState<Mode>("projected");
  const [seedETF, setSeedETF] = useState<ETFSearchResult | null>(null);
  const reducedMotion = useReducedMotion();

  function useETF(etf: ETFSearchResult) {
    setSeedETF({ ...etf });
    setMode("projected");
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="brand-mark" aria-hidden="true"><span/><span/><span/></div>
            <div><div className="text-base font-black tracking-tight">Compound</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">UK ETF Lab</div></div>
          </div>
          <div className="hidden text-right sm:block"><div className="text-xs font-semibold text-slate-600">GBP · London Stock Exchange</div><div className="mt-0.5 text-[11px] text-slate-400">Live market data when configured</div></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-7 sm:px-6 lg:px-8">
        <section className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Plan. Test. Compare.</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">A clearer way to model long-term ETF investing.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Model assumptions instantly, then switch to actual historical monthly investing without mixing the two.</p>
          </div>
          <div className="mode-tabs" role="tablist" aria-label="Calculator mode">
            {modes.map((item) => <button key={item.key} role="tab" aria-selected={mode === item.key} onClick={() => setMode(item.key)} className={mode === item.key ? "active" : ""}><span className="hidden sm:inline">{item.label}</span><span className="sm:hidden">{item.short}</span></button>)}
          </div>
        </section>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            {mode === "projected" && <ProjectionMode seedETF={seedETF} />}
            {mode === "historical" && <HistoricalMode />}
            {mode === "compare" && <CompareMode />}
            {mode === "goal" && <GoalMode />}
          </motion.div>
        </AnimatePresence>

        <ExploreETFs onUse={useETF} />

        <footer className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500">
          <strong className="block text-slate-700">Important information</strong>
          <p className="mt-1">Investments can rise and fall in value and you may get back less than you invest. Past performance does not guarantee future returns. Calculations are illustrative and do not constitute financial advice.</p>
          <p className="mt-2">Projected future performance is based only on user-selected assumptions. Historical ETF data is displayed separately and is never treated as a forecast.</p>
        </footer>
      </div>
    </main>
  );
}
