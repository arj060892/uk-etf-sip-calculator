import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { marketDataError } from "@/lib/market-data/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  try {
    const profile = await getMarketDataProvider().getETFProfile(symbol);
    return NextResponse.json(profile);
  } catch (error) {
    return marketDataError(error);
  }
}
