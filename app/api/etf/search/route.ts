import { NextRequest, NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market-data";
import { marketDataError } from "@/lib/market-data/http";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await getMarketDataProvider().searchETFs(query);
    return NextResponse.json({ results });
  } catch (error) {
    return marketDataError(error);
  }
}
