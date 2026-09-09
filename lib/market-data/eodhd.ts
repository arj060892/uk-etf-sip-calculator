import type { MarketDataProvider } from "./provider";
import type { ETFProfile, ETFQuote, ETFSearchResult, PricePoint } from "../types";

const API_BASE = "https://eodhd.com/api";

function apiKey() {
  const value = process.env.EODHD_API_KEY;
  if (!value) throw new Error("EODHD_API_KEY is not configured");
  return value;
}

function normaliseSymbol(symbol: string) {
  const cleaned = decodeURIComponent(symbol).trim().toUpperCase();
  return cleaned.includes(".") ? cleaned : `${cleaned}.LSE`;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function distributionFromName(name: string): "Accumulating" | "Distributing" | null {
  if (/\b(acc|accumulating)\b/i.test(name)) return "Accumulating";
  if (/\b(dist|distributing|income)\b/i.test(name)) return "Distributing";
  return null;
}

function dominantRegion(data: any): string | null {
  const regions = data?.World_Regions;
  if (!regions || typeof regions !== "object") return null;
  let best: { name: string; weight: number } | null = null;
  for (const [name, row] of Object.entries<any>(regions)) {
    const weight = parseNumber(row?.["Equity_%"] ?? row?.Equity);
    if (weight !== null && (!best || weight > best.weight)) best = { name, weight };
  }
  return best?.name ?? null;
}

function normaliseFee(data: any): number | null {
  const ongoing = parseNumber(data?.Ongoing_Charge);
  if (ongoing !== null) return ongoing;
  const net = parseNumber(data?.NetExpenseRatio);
  if (net === null) return null;
  return Math.abs(net) < 0.1 ? net * 100 : net;
}

function normaliseCurrencyPrice(price: number | null, currency: string | null) {
  if (price === null) return null;
  if (currency && /^(GBX|GBp)$/i.test(currency)) return price / 100;
  return price;
}

async function getJson<T>(url: string, revalidate = 300): Promise<T> {
  const response = await fetch(url, { next: { revalidate } });
  if (!response.ok) throw new Error(`Market data request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export class EodhdProvider implements MarketDataProvider {
  async searchETFs(query: string): Promise<ETFSearchResult[]> {
    if (!query.trim()) return [];
    const url = `${API_BASE}/search/${encodeURIComponent(query)}?api_token=${apiKey()}&fmt=json&limit=30`;
    const rows = await getJson<any[]>(url, 900);
    return rows
      .filter(
        (row) =>
          String(row.Exchange ?? "").toUpperCase() === "LSE" &&
          String(row.Type ?? "").toUpperCase().includes("ETF"),
      )
      .slice(0, 15)
      .map((row) => ({
        symbol: `${row.Code}.LSE`,
        ticker: row.Code,
        name: row.Name,
        exchange: "LSE",
        currency: row.Currency ?? null,
      }));
  }

  async getETFQuote(symbol: string): Promise<ETFQuote> {
    const ticker = normaliseSymbol(symbol);
    let profileCurrency: string | null = null;
    try {
      const profile = await this.getETFProfile(ticker);
      profileCurrency = profile.currency;
    } catch {
      // Quote still has a useful fallback path when fundamentals are unavailable.
    }

    try {
      const url = `${API_BASE}/real-time/${encodeURIComponent(ticker)}?api_token=${apiKey()}&fmt=json`;
      const row = await getJson<any>(url, 60);
      const rawPrice = parseNumber(row.close ?? row.price);
      return {
        symbol: ticker,
        price: normaliseCurrencyPrice(rawPrice, profileCurrency),
        currency: profileCurrency === "GBX" ? "GBP" : profileCurrency,
        asOf: row.timestamp ? new Date(Number(row.timestamp) * 1000).toISOString() : null,
        source: rawPrice === null ? null : "realtime",
      };
    } catch {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
      const url = `${API_BASE}/eod/${encodeURIComponent(ticker)}?api_token=${apiKey()}&fmt=json&period=d&order=d&from=${from}&to=${to}`;
      const rows = await getJson<any[]>(url, 300);
      const latest = rows.at(-1);
      const rawPrice = latest ? parseNumber(latest.close) : null;
      return {
        symbol: ticker,
        price: normaliseCurrencyPrice(rawPrice, profileCurrency),
        currency: profileCurrency === "GBX" ? "GBP" : profileCurrency,
        asOf: latest?.date ?? null,
        source: rawPrice === null ? null : "latest-eod",
      };
    }
  }

  async getETFHistory(symbol: string, from: string, to: string): Promise<PricePoint[]> {
    const ticker = normaliseSymbol(symbol);
    const profile = await this.getETFProfile(ticker).catch(() => null);
    const currency = profile?.currency ?? null;
    const url = `${API_BASE}/eod/${encodeURIComponent(ticker)}?api_token=${apiKey()}&fmt=json&period=m&order=a&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const rows = await getJson<any[]>(url, 3600);
    return rows
      .map((row) => {
        const close = normaliseCurrencyPrice(parseNumber(row.close), currency);
        const adjustedClose = normaliseCurrencyPrice(parseNumber(row.adjusted_close), currency);
        if (!row.date || close === null || adjustedClose === null) return null;
        return { date: row.date, close, adjustedClose };
      })
      .filter((row): row is PricePoint => row !== null);
  }

  async getETFProfile(symbol: string): Promise<ETFProfile> {
    const ticker = normaliseSymbol(symbol);
    const url = `${API_BASE}/v1.1/fundamentals/${encodeURIComponent(ticker)}?api_token=${apiKey()}&fmt=json`;
    const data = await getJson<any>(url, 86400);
    const general = data?.General ?? {};
    const etf = data?.ETF_Data ?? {};
    const performance = etf?.Performance ?? {};
    const currency = general.CurrencyCode ?? null;

    return {
      symbol: ticker,
      ticker: general.Code ?? ticker.split(".")[0],
      name: general.Name ?? ticker,
      exchange: general.Exchange ?? "LSE",
      currency: currency === "GBX" ? "GBP" : currency,
      provider: etf.Company_Name ?? null,
      benchmark: etf.Index_Name ?? etf?.MorningStar?.Category_Benchmark ?? null,
      category: general.Category ?? null,
      region: dominantRegion(etf),
      domicile: etf.Domicile ?? null,
      distributionPolicy: distributionFromName(general.Name ?? ""),
      ongoingChargePct: normaliseFee(etf),
      fundSize: parseNumber(etf.TotalAssets),
      return1Y: parseNumber(performance.Returns_1Y),
      return3YAnnualised: parseNumber(performance.Returns_3Y),
      return5YAnnualised: parseNumber(performance.Returns_5Y),
      volatility3Y: parseNumber(performance["3y_Volatility"]),
      sharpe3Y: parseNumber(performance["3y_SharpRatio"]),
      updatedAt: general.UpdatedAt ?? etf.Date_Ongoing_Charge ?? null,
    };
  }
}
