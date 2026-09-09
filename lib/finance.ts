import type {
  BacktestResult,
  PricePoint,
  ProjectionInputs,
  ProjectionResult,
} from "./types";

const MONTHS_PER_YEAR = 12;

export const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function projectInvestment(
  inputs: ProjectionInputs,
  ignoreFees = false,
): ProjectionResult {
  const months = Math.max(1, Math.round(inputs.years * MONTHS_PER_YEAR));
  const netAnnualReturn = Math.max(
    -99,
    inputs.annualReturnPct - (ignoreFees ? 0 : inputs.feePct),
  );
  const monthlyRate = Math.pow(1 + netAnnualReturn / 100, 1 / 12) - 1;
  let portfolio = Math.max(0, inputs.initial);
  let contributions = Math.max(0, inputs.initial);
  let monthlyContribution = Math.max(0, inputs.monthly);
  const points = [
    {
      month: 0,
      dateLabel: "Start",
      contributions,
      portfolio,
      monthlyContribution,
    },
  ];

  for (let month = 1; month <= months; month += 1) {
    if (month > 1 && (month - 1) % 12 === 0) {
      monthlyContribution *= 1 + inputs.annualStepUpPct / 100;
    }
    portfolio *= 1 + monthlyRate;
    portfolio += monthlyContribution;
    contributions += monthlyContribution;

    points.push({
      month,
      dateLabel:
        month % 12 === 0
          ? `Year ${month / 12}`
          : `${Math.floor(month / 12)}y ${month % 12}m`,
      contributions,
      portfolio,
      monthlyContribution,
    });
  }

  const beforeFees = ignoreFees
    ? portfolio
    : projectInvestment({ ...inputs, feePct: 0 }, true).projectedPortfolio;
  const inflationAdjusted =
    portfolio / Math.pow(1 + Math.max(0, inputs.inflationPct) / 100, inputs.years);

  return {
    totalContributions: contributions,
    projectedPortfolio: portfolio,
    investmentGrowth: portfolio - contributions,
    inflationAdjusted,
    beforeFees,
    feeImpact: Math.max(0, beforeFees - portfolio),
    points,
  };
}

export function milestoneDates(
  points: ProjectionResult["points"],
  milestones = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000],
) {
  return milestones.map((target) => {
    const point = points.find((item) => item.portfolio >= target);
    return {
      target,
      month: point?.month ?? null,
    };
  });
}

export function requiredMonthlyInvestment(
  target: number,
  years: number,
  annualReturnPct: number,
  initial = 0,
  annualStepUpPct = 0,
) {
  let low = 0;
  let high = Math.max(100, target / Math.max(1, years * 12));
  const evaluate = (monthly: number) =>
    projectInvestment({
      monthly,
      initial,
      years,
      annualReturnPct,
      annualStepUpPct,
      inflationPct: 0,
      feePct: 0,
    }).projectedPortfolio;

  while (evaluate(high) < target && high < 1_000_000) high *= 2;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    if (evaluate(mid) >= target) high = mid;
    else low = mid;
  }
  return high;
}

export function timeToGoal(
  target: number,
  monthly: number,
  annualReturnPct: number,
  initial = 0,
  annualStepUpPct = 0,
) {
  const monthlyRate = Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
  let portfolio = Math.max(0, initial);
  let currentMonthly = Math.max(0, monthly);
  for (let month = 1; month <= 100 * 12; month += 1) {
    if (month > 1 && (month - 1) % 12 === 0) {
      currentMonthly *= 1 + annualStepUpPct / 100;
    }
    portfolio = portfolio * (1 + monthlyRate) + currentMonthly;
    if (portfolio >= target) return month;
  }
  return null;
}

export function simulateBacktest(
  history: PricePoint[],
  monthlyInvestment: number,
): BacktestResult {
  const valid = history
    .filter((point) => point.adjustedClose > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!valid.length) {
    return {
      totalInvested: 0,
      unitsOwned: 0,
      endValue: 0,
      gain: 0,
      percentageReturn: 0,
      xirr: null,
      points: [],
    };
  }

  let adjustedUnits = 0;
  let invested = 0;
  const cashFlows: { date: Date; amount: number }[] = [];
  const points = valid.map((point) => {
    const amount = Math.max(0, monthlyInvestment);
    adjustedUnits += amount / point.adjustedClose;
    invested += amount;
    cashFlows.push({ date: new Date(`${point.date}T12:00:00Z`), amount: -amount });
    return {
      date: point.date,
      contributions: invested,
      portfolio: adjustedUnits * point.adjustedClose,
      units: adjustedUnits,
    };
  });

  const end = points.at(-1)!;
  const endDate = new Date(`${end.date}T12:00:00Z`);
  cashFlows.push({ date: endDate, amount: end.portfolio });

  return {
    totalInvested: invested,
    unitsOwned: adjustedUnits,
    endValue: end.portfolio,
    gain: end.portfolio - invested,
    percentageReturn: invested ? ((end.portfolio - invested) / invested) * 100 : 0,
    xirr: xirr(cashFlows),
    points,
  };
}

export function annualisedVolatility(history: PricePoint[]) {
  const prices = history.map((x) => x.adjustedClose).filter((x) => x > 0);
  if (prices.length < 3) return null;
  const returns = prices.slice(1).map((p, i) => p / prices[i] - 1);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    Math.max(1, returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(12) * 100;
}

export function maximumDrawdown(history: PricePoint[]) {
  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const point of history) {
    const price = point.adjustedClose;
    if (price > peak) peak = price;
    if (peak > 0) maxDrawdown = Math.min(maxDrawdown, price / peak - 1);
  }
  return maxDrawdown * 100;
}

export function annualisedReturn(history: PricePoint[]) {
  if (history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  const years =
    (new Date(last.date).getTime() - new Date(first.date).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0 || first.adjustedClose <= 0) return null;
  return (Math.pow(last.adjustedClose / first.adjustedClose, 1 / years) - 1) * 100;
}

function xirr(cashFlows: { date: Date; amount: number }[]) {
  if (cashFlows.length < 2) return null;
  const t0 = cashFlows[0].date.getTime();
  const years = (d: Date) => (d.getTime() - t0) / (365.25 * 24 * 3600 * 1000);
  const npv = (rate: number) =>
    cashFlows.reduce(
      (sum, cf) => sum + cf.amount / Math.pow(1 + rate, years(cf.date)),
      0,
    );

  let low = -0.9999;
  let high = 10;
  let fLow = npv(low);
  let fHigh = npv(high);
  let guard = 0;
  while (fLow * fHigh > 0 && high < 1_000 && guard < 20) {
    high *= 2;
    fHigh = npv(high);
    guard += 1;
  }
  if (fLow * fHigh > 0) return null;

  for (let i = 0; i < 100; i += 1) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 0.00001) return mid * 100;
    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return ((low + high) / 2) * 100;
}
