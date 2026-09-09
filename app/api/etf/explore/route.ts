import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { marketDataError } from "@/lib/market-data/http";

const categoryQueries: Record<string, string> = {
  popular: "Vanguard ETF",
  global: "global world UCITS ETF",
  us: "S&P 500 UCITS ETF",
  uk: "FTSE 100 UCITS ETF",
  technology: "NASDAQ technology UCITS ETF",
  income: "income dividend UCITS ETF",
  "low-cost": "core UCITS ETF",
};

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? "popular";
  const query = categoryQueries[category] ?? categoryQueries.popular;
  try {
    const provider = getMarketDataProvider();
    const results = await provider.searchETFs(query);
    const profiles = await Promise.all(
      results.slice(0, 8).map(async (item) => {
        try {
          const [profile, quote] = await Promise.all([
            provider.getETFProfile(item.symbol),
            provider.getETFQuote(item.symbol),
          ]);
          return { ...profile, quote };
        } catch {
          return { ...item, quote: null };
        }
      }),
    );
    return NextResponse.json({ results: profiles });
  } catch (error) {
    return marketDataError(error);
  }
}
