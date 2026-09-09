import { EodhdProvider } from "./eodhd";
import type { MarketDataProvider } from "./provider";

let provider: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (!provider) provider = new EodhdProvider();
  return provider;
}
