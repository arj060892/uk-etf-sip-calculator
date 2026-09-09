"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
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
import { gbp, milestoneDates, projectInvestment } from "@/lib/finance";
import type { ETFProfile, ETFQuote, ETFSearchResult } from "@/lib/types";

type Props = { seedETF?: ETFSearchResult | null };

const pct = (value: number | null, digits = 1) => value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
const moneyCompact = (value: number | null) => {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", notation: "compact", maximumFractionDigits: 1 }).format(value);
};

function NumberControl({ label, value, min, max, step, suffix = "", prefix = "", onChange, presets }: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string; prefix?: string;
  onChange: (value: number) => void; presets?: number[];
}) {
  return (
    <div className="control-group">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <div className="number-input-wrap">
          {prefix && <span>{prefix}</span>}
          <input
            aria-label={label}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
          />
          {suffix && <span>{suffix}</span>}
        </div>
      </div>
      <input
        aria-label={`${label} slider`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range"
      />
      {presets && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button key={p} onClick={() => onChange(p)} className={`preset ${value === p ? "preset-active" : ""}`}>
              {prefix}{p.toLocaleString("en-GB")}{suffix}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      layout
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`metric-card ${tone === "accent" ? "metric-card-accent" : ""}`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{value}</div>
    </motion.div>
  );
}

export default function ProjectionMode({ seedETF }: Props) {
  const [monthly, setMonthly] = useState(500);
  const [initial, setInitial] = useState(5_000);
  const [years, setYears] = useState(20);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [stepUp, setStepUp] = useState(3);
  const [inflation, setInflation] = useState(2.5);
  const [fee, setFee] = useState(0);
  const [chartPeriod, setChartPeriod] = useState<"monthly" | "yearly">("yearly");
  const [selected, setSelected] = useState<ETFSearchResult | null>(null);
  const [profile, setProfile] = useState<ETFProfile | null>(null);
  const [quote, setQuote] = useState<ETFQuote | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const readNum = (key: string, current: number) => {
      const n = Number(params.get(key));
      return Number.isFinite(n) ? n : current;
    };
    setMonthly(readNum("monthly", monthly));
    setInitial(readNum("initial", initial));
    setYears(readNum("years", years));
    setAnnualReturn(readNum("return", annualReturn));
    setStepUp(readNum("step", stepUp));
    setInflation(readNum("inflation", inflation));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seedETF) selectETF(seedETF);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedETF?.symbol]);

  const result = useMemo(() => projectInvestment({
    monthly, initial, years, annualReturnPct: annualReturn, annualStepUpPct: stepUp, inflationPct: inflation, feePct: fee,
  }), [monthly, initial, years, annualReturn, stepUp, inflation, fee]);

  const milestones = useMemo(() => milestoneDates(result.points), [result.points]);
  const chartData = useMemo(() => chartPeriod === "monthly" ? result.points : result.points.filter((p) => p.month === 0 || p.month % 12 === 0), [result.points, chartPeriod]);
  const scenarios = useMemo(() => [Math.max(1, annualReturn - 2), annualReturn, Math.min(20, annualReturn + 2)].map((rate) => ({ rate, value: projectInvestment({ monthly, initial, years, annualReturnPct: rate, annualStepUpPct: stepUp, inflationPct: inflation, feePct: fee }).projectedPortfolio })), [monthly, initial, years, annualReturn, stepUp, inflation, fee]);

  async function selectETF(item: ETFSearchResult) {
    setSelected(item);
    setMarketLoading(true);
    setMarketError(false);
    try {
      const [profileRes, quoteRes] = await Promise.all([
        fetch(`/api/etf/${encodeURIComponent(item.symbol)}/profile`),
        fetch(`/api/etf/${encodeURIComponent(item.symbol)}/quote`),
      ]);
      if (!profileRes.ok || !quoteRes.ok) throw new Error("Market data unavailable");
      const [p, q] = await Promise.all([profileRes.json(), quoteRes.json()]);
      setProfile(p);
      setQuote(q);
      if (typeof p.ongoingChargePct === "number") setFee(p.ongoingChargePct);
    } catch {
      setProfile(null);
      setQuote(null);
      setMarketError(true);
    } finally {
      setMarketLoading(false);
    }
  }

  async function shareScenario() {
    const params = new URLSearchParams({ monthly: String(monthly), initial: String(initial), years: String(years), return: String(annualReturn), step: String(stepUp), inflation: String(inflation) });
    if (selected) params.set("etf", selected.ticker);
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    await navigator.clipboard.writeText(url);
    window.history.replaceState(null, "", url);
  }

  const monthText = (month: number | null) => {
    if (month === null) return "Not reached in this scenario";
    const y = Math.floor(month / 12);
    const m = month % 12;
    return `${y ? `${y} year${y === 1 ? "" : "s"}` : ""}${y && m ? " " : ""}${m ? `${m} month${m === 1 ? "" : "s"}` : ""}`;
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="panel p-4 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Projected growth</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Build your scenario</h2>
          </div>
          <button onClick={shareScenario} className="secondary-button">Share</button>
        </div>

        <ETFPicker onSelect={selectETF} />

        {selected && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="ticker-badge">{selected.ticker}</span><span className="truncate text-sm font-semibold">{selected.name}</span></div>
                {marketLoading ? <div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-200" /> : marketError ? <p className="mt-3 text-sm text-slate-500">Market data currently unavailable</p> : profile && (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div><span className="muted-label">Price</span><strong className="detail-value">{quote?.price != null ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(quote.price) : "N/A"}</strong></div>
                    <div><span className="muted-label">Ongoing charge</span><strong className="detail-value">{profile.ongoingChargePct == null ? "N/A" : `${profile.ongoingChargePct.toFixed(2)}%`}</strong></div>
                    <div><span className="muted-label">3Y annualised</span><strong className="detail-value">{pct(profile.return3YAnnualised)}</strong></div>
                    <div><span className="muted-label">Benchmark</span><strong className="detail-value truncate" title={profile.benchmark ?? "N/A"}>{profile.benchmark ?? "N/A"}</strong></div>
                  </div>
                )}
              </div>
            </div>
            {profile?.return5YAnnualised != null && (
              <button onClick={() => setAnnualReturn(Math.max(1, Math.min(20, profile.return5YAnnualised!)))} className="mt-3 text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">
                Use 5Y annualised historical return as assumption ({pct(profile.return5YAnnualised)})
              </button>
            )}
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Historical performance is never applied automatically as a future-return assumption.</p>
          </div>
        )}

        <div className="mt-6 space-y-6">
          <NumberControl label="Monthly investment" value={monthly} min={25} max={20000} step={25} prefix="£" onChange={setMonthly} presets={[100,250,500,1000,2000]} />
          <NumberControl label="Initial lump sum" value={initial} min={0} max={1000000} step={500} prefix="£" onChange={setInitial} />
          <NumberControl label="Investment duration" value={years} min={1} max={50} step={1} suffix="y" onChange={setYears} presets={[5,10,15,20,25,30]} />
          <NumberControl label="Expected annual return" value={annualReturn} min={1} max={20} step={0.1} suffix="%" onChange={setAnnualReturn} presets={[5,7,8,10,12]} />
          <NumberControl label="Annual contribution increase" value={stepUp} min={0} max={25} step={0.5} suffix="%" onChange={setStepUp} />
          <NumberControl label="Inflation" value={inflation} min={0} max={10} step={0.1} suffix="%" onChange={setInflation} />
          <NumberControl label="ETF ongoing charge" value={fee} min={0} max={3} step={0.01} suffix="%" onChange={setFee} />
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Total contributions" value={gbp.format(result.totalContributions)} />
          <MetricCard label="Investment growth" value={gbp.format(result.investmentGrowth)} />
          <MetricCard label="Projected portfolio" value={gbp.format(result.projectedPortfolio)} tone="accent" />
          <MetricCard label="Today's money" value={gbp.format(result.inflationAdjusted)} />
        </div>

        <div className="panel p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><p className="eyebrow">Growth path</p><h3 className="mt-1 text-lg font-bold">Contributions vs portfolio</h3></div>
            <div className="segmented"><button className={chartPeriod === "monthly" ? "active" : ""} onClick={() => setChartPeriod("monthly")}>Monthly</button><button className={chartPeriod === "yearly" ? "active" : ""} onClick={() => setChartPeriod("yearly")}>Yearly</button></div>
          </div>
          <div className="h-[320px] w-full" aria-label="Projected investment growth chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f172a" stopOpacity={0.18}/><stop offset="100%" stopColor="#0f172a" stopOpacity={0.01}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dateLabel" minTickGap={35} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => moneyCompact(Number(v))} width={66} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value, name) => [gbp.format(Number(value)), name === "portfolio" ? "Portfolio" : "Contributions"]} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 14, borderColor: "#e2e8f0" }} />
                <Legend />
                <Area isAnimationActive={!reducedMotion} animationDuration={500} type="monotone" dataKey="portfolio" stroke="#0f172a" strokeWidth={3} fill="url(#portfolioFill)" name="Portfolio" />
                <Area isAnimationActive={!reducedMotion} animationDuration={500} type="monotone" dataKey="contributions" stroke="#94a3b8" strokeWidth={2} fill="transparent" name="Contributions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <p className="eyebrow">Scenario range</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {scenarios.map((s, i) => <motion.div key={s.rate} layout className={`scenario-card ${i === 1 ? "scenario-active" : ""}`}><span>{["Conservative","Expected","Optimistic"][i]}</span><strong>{s.rate.toFixed(1)}%</strong><b>{moneyCompact(s.value)}</b></motion.div>)}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">These are adjustable return assumptions, not forecasts.</p>
          </div>
          <div className="panel p-5">
            <p className="eyebrow">Estimated ETF fee impact</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><span className="muted-label">Before fees</span><strong className="detail-value">{moneyCompact(result.beforeFees)}</strong></div><div><span className="muted-label">After fees</span><strong className="detail-value">{moneyCompact(result.projectedPortfolio)}</strong></div><div><span className="muted-label">Impact</span><strong className="detail-value">{moneyCompact(result.feeImpact)}</strong></div></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Estimate based on subtracting the annual ongoing charge from the assumed annual return.</p>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Milestones</p><h3 className="mt-1 text-lg font-bold">When might you get there?</h3></div><span className="text-xs text-slate-500">Illustrative</span></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {milestones.map((m) => <motion.div layout key={m.target} className="milestone"><div className="h-2 w-2 rounded-full bg-slate-900"/><div><strong>{gbp.format(m.target)}</strong><span>{monthText(m.month)}</span></div></motion.div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
