import { NextResponse } from "next/server";

export function marketDataError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown market data error";
  const isConfig = message.includes("EODHD_API_KEY");
  return NextResponse.json(
    {
      error: "Market data currently unavailable",
      detail: isConfig ? "Server market-data API key is not configured." : undefined,
    },
    { status: isConfig ? 503 : 502 },
  );
}
