"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ETFPicker from "./ETFPicker";
import { annualisedReturn, annualisedVolatility, gbp, maximumDrawdown, simulateBacktest } from "@/lib/finance";
import type { ETFSearchResult, PricePoint } from "@/lib/types";

const pct = (value: number | null, digits = 1) => value == null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;

export default function HistoricalMode() {
  const [selected, setSelected] = useState<ETFSearchResult | null>(null);
  const [monthly, setMonthly] = useState(500);
  const [start, setStart] = useState("2018-01-01");
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const result = useMemo(() => simulateBacktest(history, monthly), [history, monthly]);
  const risk = useMemo(() => ({
    cagr: annualisedReturn(history),
    volatility: annualisedVolatility(history),
    drawdown: maximumDrawdown(history),
  }), [history]);

  async function runBacktest() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/etf/${encodeURIComponent(selected.symbol)}/history?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Market data currently unavailable");
      setHistory(data.history ?? []);
      if (!(data.history ?? []).length) setError("No monthly history returned for this date range.");
    } catch (err) {
      setHistory([]);
      setError(err instanceof Error ? err.message : "Market data currently unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <section className="panel p-4 sm:p-6">
        <p className="eyebrow">Historical ETF backtest</p>
        <h2 className="mt-1 text-xl font-bold">What actually happened?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Simulates one contribution per month using the provider's dividend-and-split adjusted monthly close. Historical results stay separate from future projections.</p>

        <div className="mt-5">
          <ETFPicker onSelect={(item) => { setSelected(item); setHistory([]); }} label="ETF" />
        </div>
        {selected && <div className="mt-3 flex items-center gap-2 text-sm"><span className="ticker-badge">{selected.ticker}</span><span className="truncate font-semibold">{selected.name}</span></div>}

        <div className="mt-6 space-y-5">
          <label className="block"><span className="input-label">Monthly investment</span><div className="number-input-large"><span>£</span><input type="number" min="25" max="20000" step="25" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))}/></div></label>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="input-label">Start date</span><input className="date-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label><span className="input-label">End date</span><input className="date-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <button disabled={!selected || loading} onClick={runBacktest} className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Loading historical prices…" : "Run historical backtest"}</button>
          {error && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{error.includes("Market data") ? "Market data currently unavailable" : error}</div>}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Dividend treatment</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">Adjusted close is used for the total-return path. The configured provider adjusts this field for both dividends and splits. Units shown are adjusted-price units used for the simulation, not broker statement units.</p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Total invested", gbp.format(result.totalInvested)],
            ["End value", gbp.format(result.endValue)],
            ["Investment gain", gbp.format(result.gain)],
            ["Return", pct(result.percentageReturn)],
            ["Money-weighted", pct(result.xirr)],
          ].map(([label, value], i) => <motion.div key={label} layout className={`metric-card ${i === 1 ? "metric-card-accent" : ""}`}><div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="mt-2 text-xl font-bold tracking-tight text-slate-950">{value}</div></motion.div>)}
        </div>

        <div className="panel p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow">Historical monthly investing</p><h3 className="mt-1 text-lg font-bold">Portfolio value vs contributions</h3></div>
            {history.length > 0 && <span className="text-xs text-slate-500">{history.length} monthly observations</span>}
          </div>
          <div className="h-[360px] w-full">
            {history.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.points} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" minTickGap={35} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `£${Math.round(Number(v) / 1000)}k`} width={58} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value, name) => [name === "units" ? Number(value).toFixed(4) : gbp.format(Number(value)), name === "portfolio" ? "Portfolio" : name === "contributions" ? "Contributions" : "Units"]} contentStyle={{ borderRadius: 14, borderColor: "#e2e8f0" }} />
                  <Legend />
                  <Area isAnimationActive={!reducedMotion} type="monotone" dataKey="portfolio" stroke="#0f172a" strokeWidth={3} fill="#0f172a" fillOpacity={0.08} name="Portfolio" />
                  <Area isAnimationActive={!reducedMotion} type="monotone" dataKey="contributions" stroke="#94a3b8" strokeWidth={2} fill="transparent" name="Contributions" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart"><div className="empty-chart-icon">↗</div><strong>Choose an ETF and run a backtest</strong><span>The chart will use real monthly adjusted historical prices.</span></div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-5"><span className="muted-label">ETF annualised return</span><strong className="mt-2 block text-2xl">{pct(risk.cagr)}</strong><p className="mt-2 text-xs text-slate-500">CAGR of adjusted ETF price over the selected period.</p></div>
          <div className="panel p-5"><span className="muted-label">Annualised volatility</span><strong className="mt-2 block text-2xl">{pct(risk.volatility)}</strong><p className="mt-2 text-xs text-slate-500">Standard deviation of monthly returns, annualised.</p></div>
          <div className="panel p-5"><span className="muted-label">Maximum drawdown</span><strong className="mt-2 block text-2xl">{pct(risk.drawdown)}</strong><p className="mt-2 text-xs text-slate-500">Largest peak-to-trough fall in the adjusted price series.</p></div>
        </div>
      </section>
    </div>
  );
}
