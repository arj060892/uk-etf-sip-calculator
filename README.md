# Compound — UK ETF SIP Calculator

A polished Next.js application for UK investors that keeps projected returns separate from historical ETF performance.

## Included

- Projected growth with live-updating sliders and editable inputs
- Monthly contribution step-up
- Inflation-adjusted value
- ETF fee impact
- Conservative / expected / optimistic scenarios
- Portfolio milestones
- Reverse goal calculator
- Searchable LSE ETF selector
- Live ETF profile / quote integration
- Historical monthly-investment backtest using adjusted closes
- XIRR / money-weighted return
- Annualised return, volatility and maximum drawdown
- Up-to-3 ETF comparison
- Explore ETFs section with sorting and filters
- Shareable projected scenarios through URL parameters
- Mobile-first responsive layout
- Reduced-motion support
- Server-only market-data key

## Market data

The default provider is **EODHD**, isolated behind `lib/market-data/provider.ts`.

The rest of the app calls only the provider interface, so another data source can replace EODHD without rewriting the UI or calculation layer.

EODHD endpoints used:

- Search API for ETF autocomplete
- Fundamentals API v1.1 for issuer, benchmark, charges, fund size and performance metrics
- Real-time API with latest-EOD fallback for price
- EOD Historical API with monthly `adjusted_close` for backtesting

The UI does not fabricate missing market metrics. Missing fields render as `N/A`; failed market requests render `Market data currently unavailable`.

## Run locally

```bash
cp .env.example .env.local
# Add your EODHD key to .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production checks

```bash
npm run typecheck
npm run build
```

## Notes on historical units

The backtest uses EODHD `adjusted_close`, which adjusts for dividends and splits. This gives a total-return-consistent historical path. The displayed unit count is therefore the adjusted-price unit count used by the simulation rather than the exact unit count that would appear on a broker statement.

## Important

Projected values are illustrative assumptions, not forecasts. Historical ETF returns are never inserted automatically into future-return assumptions; the user must explicitly choose to use a historical metric as an assumption.
