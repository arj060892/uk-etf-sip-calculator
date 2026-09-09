import type { ETFProfile, ETFQuote, ETFSearchResult, PricePoint } from "../types";

export interface MarketDataProvider {
  searchETFs(query: string): Promise<ETFSearchResult[]>;
  getETFQuote(symbol: string): Promise<ETFQuote>;
  getETFHistory(symbol: string, from: string, to: string): Promise<PricePoint[]>;
  getETFProfile(symbol: string): Promise<ETFProfile>;
}
