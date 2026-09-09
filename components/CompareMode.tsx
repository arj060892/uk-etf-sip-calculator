"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ETFPicker from "./ETFPicker";
import { annualisedReturn, annualisedVolatility, gbp, maximumDrawdown, simulateBacktest } from "@/lib/finance";
import type { ETFProfile, ETFSearchResult, PricePoint } from "@/lib/types";

type Compared = {
  etf: ETFSearchResult;
  profile: ETFProfile | null;
  history: PricePoint[];
  endValue: number;
  cagr: number | null;
  volatility: number | null;
  drawdown: number | null;
};

const pct = (value: number | null) => value == null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export default function CompareMode() {
  const [slots, setSlots] = useState<(ETFSearchResult | null)[]>([null, null, null]);
  const [monthly, setMonthly] = useState(500);
  const [start, setStart] = useState("2018-01-01");
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [compared, setCompared] = useState<Compared[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compare() {
    const selected = slots.filter((x): x is ETFSearchResult => Boolean(x));
    if (!selected.length) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await Promise.all(selected.map(async (etf) => {
        const [historyRes, profileRes] = await Promise.all([
          fetch(`/api/etf/${encodeURIComponent(etf.symbol)}/history?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`),
          fetch(`/api/etf/${encodeURIComponent(etf.symbol)}/profile`),
        ]);
        if (!historyRes.ok) throw new Error("Market data currently unavailable");
        const histData = await historyRes.json();
        const profile = profileRes.ok ? await profileRes.json() : null;
        const history: PricePoint[] = histData.history ?? [];
        const backtest = simulateBacktest(history, monthly);
        return {
          etf, profile, history,
          endValue: backtest.endValue,
          cagr: annualisedReturn(history),
          volatility: annualisedVolatility(history),
          drawdown: maximumDrawdown(history),
        };
      }));
      setCompared(rows);
    } catch (err) {
      setCompared([]);
      setError(err instanceof Error ? err.message : "Market data currently unavailable");
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    for (const item of compared) {
      const result = simulateBacktest(item.history, monthly);
      for (const point of result.points) {
        const row = byDate.get(point.date) ?? { date: point.date };
        row[item.etf.ticker] = point.portfolio;
        byDate.set(point.date, row);
      }
    }
    return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [compared, monthly]);

  const strokes = ["#0f172a", "#0f766e", "#7c3aed"];

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="eyebrow">Comparison mode</p><h2 className="mt-1 text-xl font-bold">Compare up to three LSE ETFs</h2><p className="mt-2 text-sm text-slate-500">Same monthly contribution and time window for every ETF.</p></div>
          <button disabled={loading || !slots.some(Boolean)} onClick={compare} className="primary-button disabled:opacity-50">{loading ? "Comparing…" : "Compare ETFs"}</button>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {slots.map((slot, index) => <div key={index} className="rounded-2xl border border-slate-200 p-4"><ETFPicker compact label={`ETF ${index + 1}`} onSelect={(item) => setSlots((prev) => prev.map((x, i) => i === index ? item : x))}/>{slot && <div className="mt-3 flex items-center gap-2"><span className="ticker-badge">{slot.ticker}</span><span className="truncate text-xs font-semibold">{slot.name}</span></div>}</div>)}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label><span className="input-label">Monthly investment</span><div className="number-input-large"><span>£</span><input type="number" value={monthly} min="25" onChange={(e) => setMonthly(Number(e.target.value))}/></div></label>
          <label><span className="input-label">Start date</span><input className="date-input" type="date" value={start} onChange={(e) => setStart(e.target.value)}/></label>
          <label><span className="input-label">End date</span><input className="date-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)}/></label>
        </div>
        {error && <p className="mt-4 text-sm text-slate-500">Market data currently unavailable</p>}
      </section>

      {compared.length > 0 && <>
        <section className="panel overflow-x-auto p-5 sm:p-6">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-[0.1em] text-slate-500"><th className="pb-3 font-semibold">Metric</th>{compared.map((x) => <th key={x.etf.symbol} className="pb-3 font-semibold">{x.etf.ticker}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td>Historical monthly-investing outcome</td>{compared.map((x) => <td key={x.etf.symbol} className="font-bold">{gbp.format(x.endValue)}</td>)}</tr>
              <tr><td>ETF annualised total return</td>{compared.map((x) => <td key={x.etf.symbol}>{pct(x.cagr)}</td>)}</tr>
              <tr><td>Annualised volatility</td>{compared.map((x) => <td key={x.etf.symbol}>{pct(x.volatility)}</td>)}</tr>
              <tr><td>Maximum drawdown</td>{compared.map((x) => <td key={x.etf.symbol}>{pct(x.drawdown)}</td>)}</tr>
              <tr><td>Ongoing charge</td>{compared.map((x) => <td key={x.etf.symbol}>{x.profile?.ongoingChargePct == null ? "N/A" : `${x.profile.ongoingChargePct.toFixed(2)}%`}</td>)}</tr>
              <tr><td>Fund size</td>{compared.map((x) => <td key={x.etf.symbol}>{x.profile?.fundSize == null ? "N/A" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", notation: "compact", maximumFractionDigits: 1 }).format(x.profile.fundSize)}</td>)}</tr>
            </tbody>
          </table>
        </section>
        <section className="panel p-5 sm:p-6">
          <p className="eyebrow">Visual comparison</p><h3 className="mt-1 text-lg font-bold">Monthly-investment portfolio paths</h3>
          <div className="mt-4 h-[360px]">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="4 8" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="date" minTickGap={35} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v) => `£${Math.round(Number(v)/1000)}k`} width={60} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}/><Tooltip formatter={(v) => gbp.format(Number(v))} contentStyle={{ borderRadius: 14, borderColor: "#e2e8f0" }}/><Legend/>{compared.map((x, i) => <Line key={x.etf.symbol} type="monotone" dataKey={x.etf.ticker} stroke={strokes[i]} strokeWidth={2.5} dot={false}/>)}</LineChart></ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">A higher historical outcome does not make an ETF automatically better. Costs, diversification, risk, tracking, tax treatment and future market conditions also matter.</p>
        </section>
      </>}
    </div>
  );
}
