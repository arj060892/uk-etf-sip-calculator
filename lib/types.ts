export type ETFSearchResult = {
  symbol: string;
  ticker: string;
  name: string;
  exchange: string;
  currency: string | null;
};

export type ETFProfile = {
  symbol: string;
  ticker: string;
  name: string;
  exchange: string;
  currency: string | null;
  provider: string | null;
  benchmark: string | null;
  category: string | null;
  region: string | null;
  domicile: string | null;
  distributionPolicy: "Accumulating" | "Distributing" | null;
  ongoingChargePct: number | null;
  fundSize: number | null;
  return1Y: number | null;
  return3YAnnualised: number | null;
  return5YAnnualised: number | null;
  volatility3Y: number | null;
  sharpe3Y: number | null;
  updatedAt: string | null;
};

export type ETFQuote = {
  symbol: string;
  price: number | null;
  currency: string | null;
  asOf: string | null;
  source: "realtime" | "latest-eod" | null;
};

export type PricePoint = {
  date: string;
  close: number;
  adjustedClose: number;
};

export type ProjectionInputs = {
  monthly: number;
  initial: number;
  years: number;
  annualReturnPct: number;
  annualStepUpPct: number;
  inflationPct: number;
  feePct: number;
};

export type ProjectionPoint = {
  month: number;
  dateLabel: string;
  contributions: number;
  portfolio: number;
  monthlyContribution: number;
};

export type ProjectionResult = {
  totalContributions: number;
  projectedPortfolio: number;
  investmentGrowth: number;
  inflationAdjusted: number;
  beforeFees: number;
  feeImpact: number;
  points: ProjectionPoint[];
};

export type BacktestPoint = {
  date: string;
  contributions: number;
  portfolio: number;
  units: number;
};

export type BacktestResult = {
  totalInvested: number;
  unitsOwned: number;
  endValue: number;
  gain: number;
  percentageReturn: number;
  xirr: number | null;
  points: BacktestPoint[];
};
