import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { marketDataError } from "@/lib/market-data/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const from = request.nextUrl.searchParams.get("from") ?? "2016-01-01";
  const to = request.nextUrl.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  try {
    const history = await getMarketDataProvider().getETFHistory(symbol, from, to);
    return NextResponse.json({ history });
  } catch (error) {
    return marketDataError(error);
  }
}
