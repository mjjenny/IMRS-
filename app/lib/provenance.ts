export type MetricSource = "app" | "trendlyne" | "nse" | "bse" | "kite" | "manual" | "derived";

export type MetricConfidence = "verified" | "derived" | "inferred" | "unverified" | "missing";

export type MetricPeriodType = "FY" | "Quarter" | "TTM" | "Current" | "AsOf" | "Unknown";

export type ProvenancedMetric = {
  key: string;
  label: string;
  value: string;
  unit: string;
  period: string;
  periodType: MetricPeriodType;
  asOf: string;
  source: MetricSource;
  confidence: MetricConfidence;
  notes: string[];
};

export type CriticalMetrics = {
  revenue: ProvenancedMetric;
  netProfit: ProvenancedMetric;
  eps: ProvenancedMetric;
  pe: ProvenancedMetric;
  roe: ProvenancedMetric;
  roce: ProvenancedMetric;
  debtEquity: ProvenancedMetric;
  promoterHolding: ProvenancedMetric;
  salesGrowth: ProvenancedMetric;
  profitGrowth: ProvenancedMetric;
  opm: ProvenancedMetric;
  operatingCashFlow: ProvenancedMetric;
  currentPrice: ProvenancedMetric;
  marketCap: ProvenancedMetric;
  fiiHolding: ProvenancedMetric;
  diiHolding: ProvenancedMetric;
  institutionalHolding: ProvenancedMetric;
};

export type SegmentAnalysisPacket = {
  required: boolean;
  status: "complete" | "partial" | "required";
  reason: string;
  knownSegments: string[];
  codexMustAnalyze: string[];
};

export type ScoringRationalePacket = {
  convictionScoreBasis: string[];
  multibaggerScoreBasis: string[];
  trapRiskBasis: string[];
  scorecardRationale: Array<{ factor: string; score: number; rationale: string }>;
};

type MetricInput = {
  key: keyof CriticalMetrics;
  label: string;
  value: unknown;
  unit: string;
  period?: string;
  periodType?: MetricPeriodType;
  asOf?: string;
  source?: MetricSource;
  notes?: string[];
};

type MetricRecord = Record<string, string | number | null | undefined>;

const missingTokens = new Set(["", "-", "na", "n/a", "null", "none", "undefined"]);

export const criticalMetricKeys: Array<keyof CriticalMetrics> = [
  "revenue",
  "netProfit",
  "eps",
  "pe",
  "roe",
  "roce",
  "debtEquity",
  "promoterHolding",
  "salesGrowth",
  "profitGrowth",
  "opm",
  "operatingCashFlow",
  "currentPrice",
  "marketCap",
  "fiiHolding",
  "diiHolding",
  "institutionalHolding"
];

export function normalizeMetricValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = String(value).trim();
  if (missingTokens.has(text.toLowerCase())) return "";
  return text.replace(/[,₹]/g, "");
}

function confidenceFor(value: string, period: string, source: MetricSource): MetricConfidence {
  if (!value) return "missing";
  if (source === "derived") return "derived";
  if (period) return source === "manual" || source === "app" ? "inferred" : "verified";
  return "unverified";
}

function metric(input: MetricInput): ProvenancedMetric {
  const value = normalizeMetricValue(input.value);
  const period = input.period || input.asOf || "";
  const source = input.source || "manual";
  const notes = [...(input.notes || [])];
  if (!period) notes.push("No explicit period attached; verify before using in the final report.");
  if (!value) notes.push("Metric not available in the current evidence packet.");

  return {
    key: input.key,
    label: input.label,
    value,
    unit: input.unit,
    period,
    periodType: input.periodType || (period ? "AsOf" : "Unknown"),
    asOf: input.asOf || "",
    source,
    confidence: confidenceFor(value, period, source),
    notes
  };
}

export function buildCriticalMetrics(record: MetricRecord, source: MetricSource = "app", asOf = ""): CriticalMetrics {
  const reportDate = String(record.reportDate || record.asOnDate || asOf || "");
  const currentAsOf = String(record.importedAt || asOf || "");

  return {
    revenue: metric({ key: "revenue", label: "Revenue", value: record.revenue, unit: "INR crore", period: reportDate, periodType: "FY", asOf: reportDate, source }),
    netProfit: metric({ key: "netProfit", label: "Net profit", value: record.profit, unit: "INR crore", period: reportDate, periodType: "FY", asOf: reportDate, source }),
    eps: metric({ key: "eps", label: "EPS", value: record.eps, unit: "INR", period: reportDate, periodType: reportDate ? "TTM" : "Unknown", asOf: reportDate, source }),
    pe: metric({ key: "pe", label: "P/E", value: record.pe, unit: "x", period: currentAsOf, periodType: "Current", asOf: currentAsOf, source }),
    roe: metric({ key: "roe", label: "ROE", value: record.roe, unit: "%", period: reportDate, periodType: "FY", asOf: reportDate, source }),
    roce: metric({ key: "roce", label: "ROCE", value: record.roce, unit: "%", period: reportDate, periodType: "FY", asOf: reportDate, source }),
    debtEquity: metric({ key: "debtEquity", label: "Debt/Equity", value: record.debtEquity, unit: "x", period: reportDate, periodType: "FY", asOf: reportDate, source }),
    promoterHolding: metric({ key: "promoterHolding", label: "Promoter holding", value: record.promoterHolding, unit: "%", period: reportDate, periodType: "AsOf", asOf: reportDate, source }),
    salesGrowth: metric({ key: "salesGrowth", label: "Sales growth", value: record.salesGrowth, unit: "%", period: reportDate, periodType: "TTM", asOf: reportDate, source }),
    profitGrowth: metric({ key: "profitGrowth", label: "Profit growth", value: record.profitGrowth, unit: "%", period: reportDate, periodType: "TTM", asOf: reportDate, source }),
    opm: metric({ key: "opm", label: "Operating margin", value: record.opm, unit: "%", period: reportDate, periodType: "FY", asOf: reportDate, source }),
    operatingCashFlow: metric({ key: "operatingCashFlow", label: "Operating cash flow", value: record.cfo, unit: "INR crore", period: reportDate, periodType: "FY", asOf: reportDate, source }),
    currentPrice: metric({ key: "currentPrice", label: "Current price", value: record.currentPrice, unit: "INR", period: currentAsOf, periodType: "Current", asOf: currentAsOf, source }),
    marketCap: metric({ key: "marketCap", label: "Market cap", value: record.marketCap, unit: "INR crore", period: currentAsOf, periodType: "Current", asOf: currentAsOf, source }),
    fiiHolding: metric({ key: "fiiHolding", label: "FII holding", value: record.fiiHolding, unit: "%", period: reportDate, periodType: "AsOf", asOf: reportDate, source }),
    diiHolding: metric({ key: "diiHolding", label: "DII holding", value: record.diiHolding, unit: "%", period: reportDate, periodType: "AsOf", asOf: reportDate, source }),
    institutionalHolding: metric({
      key: "institutionalHolding",
      label: "Institutional holding",
      value: record.institutionalHolding,
      unit: "%",
      period: reportDate,
      periodType: "AsOf",
      asOf: reportDate,
      source
    })
  };
}

export function normalizeTrendlyneToProvenance(record: MetricRecord): CriticalMetrics {
  return buildCriticalMetrics(record, "trendlyne", String(record.importedAt || ""));
}

export function buildSegmentAnalysisPacket(input: { companyName: string; sector: string; businessSummary: string; industryOpportunity: string }): SegmentAnalysisPacket {
  const text = `${input.companyName} ${input.sector} ${input.businessSummary} ${input.industryOpportunity}`.toLowerCase();
  const knownSegments = [
    ["retail", "Retail"],
    ["digital", "Digital"],
    ["jio", "Digital / Telecom"],
    ["oil", "Oil and Gas / Energy"],
    ["o2c", "O2C"],
    ["defence", "Defence"],
    ["aerospace", "Aerospace"],
    ["ems", "Electronics Manufacturing"],
    ["railway", "Railways"],
    ["pharma", "Pharma / Healthcare"],
    ["chemical", "Chemicals"]
  ]
    .filter(([needle]) => text.includes(needle))
    .map(([, label]) => label);
  const required = /conglomerate|diversified|segment|retail|digital|jio|o2c|oil|defence|aerospace|ems|railway|multiple businesses/.test(text);

  return {
    required,
    status: required && knownSegments.length < 2 ? "required" : knownSegments.length ? "partial" : "required",
    reason: required
      ? "Segment economics materially affect growth, margin, capital allocation and valuation."
      : "At minimum, verify whether the company has one core business or multiple economic segments.",
    knownSegments: Array.from(new Set(knownSegments)),
    codexMustAnalyze: [
      "Identify revenue/profit mix by segment before assigning business quality.",
      "Separate cyclical, regulated, high-growth and low-return segments.",
      "Do not let one strong segment justify the whole-company valuation without capital-allocation evidence.",
      "State which segment must drive 5x/10x potential and what would invalidate that path."
    ]
  };
}

function scoreRationale(score: number, strong: string, weak: string) {
  if (score >= 75) return strong;
  if (score <= 45) return weak;
  return "Mixed evidence; keep score provisional until primary filings and management commentary confirm durability.";
}

export function buildScoringRationalePacket(scores: Record<string, number>, metrics: MetricRecord): ScoringRationalePacket {
  const roe = normalizeMetricValue(metrics.roe);
  const roce = normalizeMetricValue(metrics.roce);
  const salesGrowth = normalizeMetricValue(metrics.salesGrowth);
  const profitGrowth = normalizeMetricValue(metrics.profitGrowth);
  const pe = normalizeMetricValue(metrics.pe);

  return {
    convictionScoreBasis: [
      `Capital efficiency basis: ROE ${roe || "unverified"}%, ROCE ${roce || "unverified"}%.`,
      `Growth basis: sales growth ${salesGrowth || "unverified"}%, profit growth ${profitGrowth || "unverified"}%.`,
      `Valuation basis: P/E ${pe || "unverified"}x, cross-check against EPS and current price before final stance.`
    ],
    multibaggerScoreBasis: [
      "Requires long growth runway, reinvestment headroom, improving return on capital and valuation support.",
      "Large-cap or mega-cap names should be judged as compounder/re-rating candidates unless 5x/10x mathematics is explicitly defensible."
    ],
    trapRiskBasis: [
      "Trap risk rises when valuation stays high while profit growth, cash conversion or capital efficiency weakens.",
      "Do not classify as a trap until exceptional items, base effects and segment mix are checked."
    ],
    scorecardRationale: [
      { factor: "Business quality", score: scores.businessQuality || 0, rationale: scoreRationale(scores.businessQuality || 0, "Business quality score implies durable economics need to be supported by segment evidence.", "Business quality score is weak; verify moat, pricing power and customer concentration.") },
      { factor: "Management quality", score: scores.managementQuality || 0, rationale: scoreRationale(scores.managementQuality || 0, "Management score assumes execution and governance are supportive.", "Management score is weak; review capital allocation, pledges, related parties and auditor notes.") },
      { factor: "Financial strength", score: scores.financialStrength || 0, rationale: scoreRationale(scores.financialStrength || 0, "Financial score assumes balance sheet and profitability are healthy.", "Financial score is weak; verify leverage, cash flow and margin quality.") },
      { factor: "Valuation", score: scores.valuation || 0, rationale: scoreRationale(scores.valuation || 0, "Valuation score implies price is reasonable against growth and returns.", "Valuation score is weak; require strict scenario discipline.") },
      { factor: "Risk/reward", score: scores.riskReward || 0, rationale: scoreRationale(scores.riskReward || 0, "Risk/reward score implies upside is worth underwriting.", "Risk/reward score is weak; do not force a positive verdict.") }
    ]
  };
}
