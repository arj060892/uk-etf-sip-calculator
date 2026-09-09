"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import type { ETFSearchResult } from "@/lib/types";

type Props = {
  onSelect: (result: ETFSearchResult) => void;
  label?: string;
  initialText?: string;
  compact?: boolean;
};

export default function ETFPicker({ onSelect, label = "Find an LSE ETF", initialText = "", compact = false }: Props) {
  const [query, setQuery] = useState(initialText);
  const [results, setResults] = useState<ETFSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  const inputId = useId();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/etf/search?q=${encodeURIComponent(q)}`);
        const data = await response.json();
        if (id !== requestId.current) return;
        if (!response.ok) throw new Error(data.error ?? "Search failed");
        setResults(data.results ?? []);
        setOpen(true);
      } catch (err) {
        if (id !== requestId.current) return;
        setResults([]);
        setError(err instanceof Error ? err.message : "Market data currently unavailable");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className={`search-shell ${compact ? "py-1" : ""}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-400">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
        <input
          id={inputId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="VWRP, S&P 500, Vanguard, MSCI World..."
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          autoComplete="off"
        />
        {loading && <span className="spinner" aria-label="Searching" />}
      </div>

      <AnimatePresence>
        {open && (results.length > 0 || error) && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 4 }}
            className="absolute z-40 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10"
          >
            {error ? (
              <div className="px-3 py-4 text-sm text-slate-500">Market data currently unavailable</div>
            ) : (
              results.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    onSelect(item);
                    setQuery(`${item.ticker} · ${item.name}`);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  <span className="ticker-badge">{item.ticker.slice(0, 5)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{item.exchange} · {item.currency ?? "N/A"}</span>
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
