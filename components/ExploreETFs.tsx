"use client";

import { useEffect, useMemo, useState } from "react";
import type { ETFProfile, ETFQuote, ETFSearchResult } from "@/lib/types";

type ExploreRow = Partial<ETFProfile> & ETFSearchResult & { quote?: ETFQuote | null };
type Props = { onUse: (etf: ETFSearchResult) => void };

const categories = ["popular", "global", "us", "uk", "technology", "income", "low-cost"];
const sortLabels: Record<string, string> = { fee: "Lowest Fee", fund: "Largest Fund", r1: "Best 1Y Performance", r3: "Best 3Y Performance", r5: "Best 5Y Performance" };
const pct = (v: number | null | undefined) => v == null ? "N/A" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export default function ExploreETFs({ onUse }: Props) {
  const [category, setCategory] = useState("popular");
  const [sort, setSort] = useState("fund");
  const [rows, setRows] = useState<ExploreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [providerFilter, setProviderFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [distributionFilter, setDistributionFilter] = useState("");
  const [maxFee, setMaxFee] = useState(3);
  const [maxVolatility, setMaxVolatility] = useState(100);
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    fetch(`/api/etf/explore?category=${encodeURIComponent(category)}`)
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; })
      .then((data) => { if (!cancelled) setRows(data.results ?? []); })
      .catch(() => { if (!cancelled) { setRows([]); setError(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  const visible = useMemo(() => {
    const f = rows.filter((row) => {
      const provider = String(row.provider ?? row.name ?? "").toLowerCase();
      const asset = String(row.category ?? "").toLowerCase();
      const region = String(row.region ?? "").toLowerCase();
      const dist = String(row.distributionPolicy ?? "").toLowerCase();
      const curr = String(row.currency ?? "").toUpperCase();
      return (!providerFilter || provider.includes(providerFilter.toLowerCase())) &&
        (!assetFilter || asset.includes(assetFilter.toLowerCase())) &&
        (!regionFilter || region.includes(regionFilter.toLowerCase())) &&
        (!distributionFilter || dist === distributionFilter.toLowerCase()) &&
        (row.ongoingChargePct == null || row.ongoingChargePct <= maxFee) &&
        (row.volatility3Y == null || row.volatility3Y <= maxVolatility) &&
        (!currency || curr === currency);
    });
    const metric: Record<string, (row: ExploreRow) => number> = {
      fee: (r) => r.ongoingChargePct ?? Number.POSITIVE_INFINITY,
      fund: (r) => -(r.fundSize ?? -1),
      r1: (r) => -(r.return1Y ?? -Infinity),
      r3: (r) => -(r.return3YAnnualised ?? -Infinity),
      r5: (r) => -(r.return5YAnnualised ?? -Infinity),
    };
    return [...f].sort((a, b) => metric[sort](a) - metric[sort](b));
  }, [rows, sort, providerFilter, assetFilter, regionFilter, distributionFilter, maxFee, maxVolatility, currency]);

  return (
    <section className="mt-10 border-t border-slate-200 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Live LSE discovery</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Explore ETFs</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Rankings use the selected metric only and do not imply investment advice.</p></div><select value={sort} onChange={(e) => setSort(e.target.value)} className="select-input" aria-label="Sort ETFs">{Object.entries(sortLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={`category-chip ${category === c ? "category-active" : ""}`}>{c.replace("-", " ")}</button>)}</div>

      <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Filters</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input className="filter-input" placeholder="Provider" value={providerFilter} onChange={(e)=>setProviderFilter(e.target.value)}/>
        <input className="filter-input" placeholder="Asset class" value={assetFilter} onChange={(e)=>setAssetFilter(e.target.value)}/>
        <input className="filter-input" placeholder="Dominant region" value={regionFilter} onChange={(e)=>setRegionFilter(e.target.value)}/>
        <select className="filter-input" value={distributionFilter} onChange={(e)=>setDistributionFilter(e.target.value)}><option value="">Any distribution policy</option><option>Accumulating</option><option>Distributing</option></select>
        <label className="filter-range"><span>Max fee {maxFee.toFixed(2)}%</span><input type="range" min="0" max="3" step="0.05" value={maxFee} onChange={(e)=>setMaxFee(Number(e.target.value))}/></label>
        <label className="filter-range"><span>Max 3Y volatility {maxVolatility}%</span><input type="range" min="5" max="100" step="1" value={maxVolatility} onChange={(e)=>setMaxVolatility(Number(e.target.value))}/></label>
        <select className="filter-input" value={currency} onChange={(e)=>setCurrency(e.target.value)}><option value="">Any currency</option><option value="GBP">GBP</option><option value="USD">USD</option><option value="EUR">EUR</option></select>
      </div></details>

      {loading ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-200/70"/>)}</div> : error ? <div className="mt-6 panel p-8 text-center text-sm text-slate-500">Market data currently unavailable</div> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((row) => <article key={row.symbol} className="etf-card">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="ticker-badge">{row.ticker}</span><h3 className="mt-3 line-clamp-2 text-base font-bold leading-6">{row.name}</h3><p className="mt-1 text-xs text-slate-500">{row.provider ?? "Provider N/A"} · {row.category ?? "Asset class N/A"}</p></div><div className="text-right"><span className="muted-label">Price</span><strong className="detail-value">{row.quote?.price == null ? "N/A" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(row.quote.price)}</strong></div></div>
        <div className="mt-5 grid grid-cols-3 gap-2 border-y border-slate-100 py-4 text-sm"><div><span className="muted-label">1Y</span><strong className="detail-value">{pct(row.return1Y)}</strong></div><div><span className="muted-label">3Y ann.</span><strong className="detail-value">{pct(row.return3YAnnualised)}</strong></div><div><span className="muted-label">5Y ann.</span><strong className="detail-value">{pct(row.return5YAnnualised)}</strong></div></div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><span className="muted-label">Ongoing charge</span><strong className="detail-value">{row.ongoingChargePct == null ? "N/A" : `${row.ongoingChargePct.toFixed(2)}%`}</strong></div><div><span className="muted-label">Fund size</span><strong className="detail-value">{row.fundSize == null ? "N/A" : new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP", notation:"compact", maximumFractionDigits:1 }).format(row.fundSize)}</strong></div></div>
        <button onClick={() => onUse({ symbol: row.symbol, ticker: row.ticker, name: row.name, exchange: row.exchange, currency: row.currency ?? null })} className="secondary-button mt-5 w-full">Use in calculator</button>
      </article>)}</div>}
      {!loading && !error && !visible.length && <div className="mt-6 panel p-8 text-center text-sm text-slate-500">No ETFs match these filters. Missing metrics are shown as N/A rather than guessed.</div>}
    </section>
  );
}
