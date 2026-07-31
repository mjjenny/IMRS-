"use client";

import {
  BarChart3,
  Download,
  FileDown,
  FileText,
  FlaskConical,
  Plus,
  Search,
  Upload
} from "lucide-react";
import { strFromU8, unzipSync } from "fflate";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  buildCriticalMetrics,
  buildScoringRationalePacket,
  buildSegmentAnalysisPacket,
  summarizeCriticalMetrics,
  type MetricSource
} from "./lib/provenance";

const STORAGE_KEY = "imrs_enterprise_v2";

type Scores = {
  businessQuality: number;
  managementQuality: number;
  financialStrength: number;
  growthRunway: number;
  moat: number;
  governance: number;
  valuation: number;
  cashFlowQuality: number;
  industryTailwinds: number;
  riskReward: number;
};

type Financials = {
  revenue: string;
  profit: string;
  eps: string;
  pe: string;
  roe: string;
  roce: string;
  debtEquity: string;
  promoterHolding: string;
  fiiHolding: string;
  diiHolding: string;
  institutionalHolding: string;
  salesGrowth: string;
  profitGrowth: string;
  opm: string;
  cfo: string;
  currentPrice: string;
  dvmDurability: string;
  dvmValuation: string;
  dvmMomentum: string;
  analystScore: string;
};

type ValuationCase = {
  revenueGrowth: string;
  eps: string;
  pe: string;
  probability: string;
};

type CodexReport = {
  id: string;
  title: string;
  importedAt: string;
  format: string;
  content: string;
};

type CodexReportPayload = {
  title?: string;
  report?: string;
  content?: string;
  markdown?: string;
};

type Company = {
  id: string;
  name: string;
  ticker: string;
  exchange: string;
  bseCode: string;
  isin: string;
  listedSeries: string;
  sector: string;
  marketCap: string;
  status: string;
  watchlisted: boolean;
  dataSource?: string;
  businessSummary: string;
  multibaggerCase: string;
  industryOpportunity: string;
  managementAssessment: string;
  bullThesis: string;
  bearThesis: string;
  keyAssumptions: string;
  thesisKillers: string;
  scores: Scores;
  risks: Array<{ title: string; probability: string; impact: string; mitigation: string }>;
  catalysts: Array<{ title: string; date: string; status: string; notes: string }>;
  reviews: Array<{ quarter: string; verdict: string; notes: string }>;
  documents: Array<{ name: string; type: string; status: string }>;
  codexReports: CodexReport[];
  aiPrompt: string;
  aiOutput: string;
  financials: Financials;
  valuation: {
    bear: ValuationCase;
    base: ValuationCase;
    bull: ValuationCase;
  };
};

type PortfolioPosition = {
  name: string;
  quantity: string;
  averagePrice: string;
  currentPrice: string;
};

type AppData = {
  companies: Company[];
  portfolio: PortfolioPosition[];
  fundamentals: Record<string, FundamentalsRecord>;
  shareholding: Record<string, ShareholdingRecord>;
  trendlyne: Record<string, TrendlyneIntelligenceRecord>;
};

type FundamentalsRecord = {
  id: string;
  companyName: string;
  ticker: string;
  source: string;
  importedAt: string;
  reportDate: string;
  marketCap: string;
  revenue: string;
  profit: string;
  eps: string;
  pe: string;
  roe: string;
  roce: string;
  debtEquity: string;
  promoterHolding: string;
  salesGrowth: string;
  profitGrowth: string;
  opm: string;
  cfo: string;
  currentPrice: string;
  fiiHolding: string;
  diiHolding: string;
  institutionalHolding: string;
  dvmDurability: string;
  dvmValuation: string;
  dvmMomentum: string;
  analystScore: string;
};

type ShareholdingRecord = {
  id: string;
  companyName: string;
  ticker: string;
  source: string;
  importedAt: string;
  asOnDate: string;
  submissionDate: string;
  promoterHolding: string;
  publicHolding: string;
  employeeTrusts: string;
  xbrlUrl: string;
  history: Array<{
    asOnDate: string;
    promoterHolding: string;
    publicHolding: string;
    employeeTrusts: string;
    submissionDate: string;
    xbrlUrl: string;
  }>;
};

type TrendlyneIntelligenceRecord = {
  id: string;
  companyName: string;
  ticker: string;
  source: string;
  importedAt: string;
  transport: string;
  overview: string;
  technical: string;
  news: string;
  events: string;
  shareholding: string;
  sast: string;
  bulkBlock: string;
  documents: string;
};

type TrendlyneStatus = {
  urlConfigured: boolean;
  tokenConfigured: boolean;
  apiKeyConfigured: boolean;
  connected: boolean;
  transport?: string;
  toolCount?: number;
  tools?: Array<{ name: string; description: string }>;
  message?: string;
  error?: string;
};

type DataQualityReview = {
  p0: string[];
  p1: string[];
  notes: string[];
  perShareMismatch: boolean;
  shareCountMismatch: boolean;
  cfoInvalid: boolean;
  opmInvalid: boolean;
  peInvalid: boolean;
  staleFinancials: boolean;
  conglomerateNeedsSegments: boolean;
};

type CompanySearchResult = {
  name: string;
  ticker: string;
  exchange: string;
  bseCode?: string;
  isin?: string;
  listedSeries?: string;
  sector: string;
  marketCap: string;
  currentPrice: string;
  pe: string;
  roe: string;
  roce: string;
  salesGrowth: string;
  profitGrowth: string;
  debtEquity: string;
  promoterHolding: string;
  note: string;
  source?: string;
};

type PageId = "dashboard" | "search" | "fundamentals" | "research";
type TabId = "overview" | "financials" | "report" | "documents";

const tabs: Array<[TabId, string]> = [
  ["overview", "Overview"],
  ["financials", "Financials"],
  ["report", "Report"],
  ["documents", "Documents"]
];

const starterCompanies: CompanySearchResult[] = [
  {
    name: "Central Depository Services (India) Ltd",
    ticker: "CDSL",
    exchange: "NSE",
    sector: "Capital Markets",
    marketCap: "",
    currentPrice: "",
    pe: "",
    roe: "",
    roce: "",
    salesGrowth: "",
    profitGrowth: "",
    debtEquity: "",
    promoterHolding: "",
    note: "Depository infrastructure and capital-market participation play."
  },
  {
    name: "Dixon Technologies (India) Ltd",
    ticker: "DIXON",
    exchange: "NSE",
    sector: "Electronics Manufacturing Services",
    marketCap: "",
    currentPrice: "",
    pe: "",
    roe: "",
    roce: "",
    salesGrowth: "",
    profitGrowth: "",
    debtEquity: "",
    promoterHolding: "",
    note: "EMS scale, import substitution and manufacturing outsourcing theme."
  },
  {
    name: "Hindustan Aeronautics Ltd",
    ticker: "HAL",
    exchange: "NSE",
    sector: "Defence Aerospace",
    marketCap: "",
    currentPrice: "",
    pe: "",
    roe: "",
    roce: "",
    salesGrowth: "",
    profitGrowth: "",
    debtEquity: "",
    promoterHolding: "",
    note: "Defence order book and domestic aerospace capability compounder."
  },
  {
    name: "Trent Ltd",
    ticker: "TRENT",
    exchange: "NSE",
    sector: "Retail",
    marketCap: "",
    currentPrice: "",
    pe: "",
    roe: "",
    roce: "",
    salesGrowth: "",
    profitGrowth: "",
    debtEquity: "",
    promoterHolding: "",
    note: "Retail format execution, Zudio growth and operating leverage story."
  },
  {
    name: "Kaynes Technology India Ltd",
    ticker: "KAYNES",
    exchange: "NSE",
    sector: "Electronics Manufacturing Services",
    marketCap: "",
    currentPrice: "",
    pe: "",
    roe: "",
    roce: "",
    salesGrowth: "",
    profitGrowth: "",
    debtEquity: "",
    promoterHolding: "",
    note: "High-growth EMS and industrial electronics platform."
  },
  {
    name: "KPIT Technologies Ltd",
    ticker: "KPITTECH",
    exchange: "NSE",
    sector: "Auto Software",
    marketCap: "",
    currentPrice: "",
    pe: "",
    roe: "",
    roce: "",
    salesGrowth: "",
    profitGrowth: "",
    debtEquity: "",
    promoterHolding: "",
    note: "Software-defined vehicle and automotive engineering services specialist."
  }
];

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function blankFinancials(): Financials {
  return {
    revenue: "",
    profit: "",
    eps: "",
    pe: "",
    roe: "",
    roce: "",
    debtEquity: "",
    promoterHolding: "",
    fiiHolding: "",
    diiHolding: "",
    institutionalHolding: "",
    salesGrowth: "",
    profitGrowth: "",
    opm: "",
    cfo: "",
    currentPrice: "",
    dvmDurability: "",
    dvmValuation: "",
    dvmMomentum: "",
    analystScore: ""
  };
}

function blankScores(): Scores {
  return {
    businessQuality: 5,
    managementQuality: 5,
    financialStrength: 5,
    growthRunway: 5,
    moat: 5,
    governance: 5,
    valuation: 5,
    cashFlowQuality: 5,
    industryTailwinds: 5,
    riskReward: 5
  };
}

function blankValuation() {
  return {
    bear: { revenueGrowth: "", eps: "", pe: "", probability: "25" },
    base: { revenueGrowth: "", eps: "", pe: "", probability: "50" },
    bull: { revenueGrowth: "", eps: "", pe: "", probability: "25" }
  };
}

function blankCompany(): Company {
  return {
    id: uid(),
    name: "Untitled Company",
    ticker: "",
    exchange: "",
    bseCode: "",
    isin: "",
    listedSeries: "",
    sector: "",
    marketCap: "",
    status: "Watchlist",
    watchlisted: true,
    dataSource: "Manual entry",
    businessSummary: "",
    multibaggerCase: "",
    industryOpportunity: "",
    managementAssessment: "",
    bullThesis: "",
    bearThesis: "",
    keyAssumptions: "",
    thesisKillers: "",
    scores: blankScores(),
    risks: [],
    catalysts: [],
    reviews: [],
    documents: [],
    codexReports: [],
    aiPrompt: "",
    aiOutput: "",
    financials: blankFinancials(),
    valuation: blankValuation()
  };
}

function demoCompany(): Company {
  return {
    ...blankCompany(),
    name: "Sample Small Cap Ltd",
    ticker: "SAMPLE",
    sector: "Industrial Manufacturing",
    marketCap: "1500",
    status: "Researching",
    dataSource: "Sample data",
    businessSummary: "Replace this sample with products, customers, revenue model, geography and unit economics.",
    multibaggerCase:
      "A large addressable market, capacity expansion and disciplined reinvestment could create long-term compounding.",
    industryOpportunity: "Map industry size, structural growth, policy support, competition and market-share runway.",
    managementAssessment: "Assess promoter integrity, governance, execution and capital allocation.",
    bullThesis: "Build the strongest evidence-backed upside case.",
    bearThesis: "Build the strongest evidence-backed downside case.",
    keyAssumptions: "List every assumption that must hold.",
    thesisKillers: "Define evidence requiring exit or reassessment.",
    scores: {
      businessQuality: 7,
      managementQuality: 7,
      financialStrength: 6,
      growthRunway: 8,
      moat: 6,
      governance: 7,
      valuation: 5,
      cashFlowQuality: 6,
      industryTailwinds: 8,
      riskReward: 7
    },
    risks: [
      {
        title: "Customer concentration",
        probability: "Medium",
        impact: "High",
        mitigation: "Track top-customer share and diversification."
      }
    ],
    catalysts: [
      {
        title: "New capacity commissioning",
        date: "",
        status: "Expected",
        notes: "Monitor project timeline and utilization."
      }
    ],
    reviews: [
      {
        quarter: "Q1 FY27",
        verdict: "Unchanged",
        notes: "Record results, guidance, execution, valuation and thesis changes."
      }
    ],
    documents: [{ name: "FY26 Annual Report", type: "Annual Report", status: "To Review" }],
    financials: {
      revenue: "850",
      profit: "72",
      eps: "18",
      pe: "24",
      roe: "17",
      roce: "21",
      debtEquity: "0.35",
      promoterHolding: "58",
      fiiHolding: "8",
      diiHolding: "12",
      institutionalHolding: "20",
      salesGrowth: "22",
      profitGrowth: "28",
      opm: "14",
      cfo: "68",
      currentPrice: "432",
      dvmDurability: "62",
      dvmValuation: "48",
      dvmMomentum: "71",
      analystScore: "64"
    },
    valuation: {
      bear: { revenueGrowth: "10", eps: "20", pe: "15", probability: "25" },
      base: { revenueGrowth: "20", eps: "35", pe: "25", probability: "50" },
      bull: { revenueGrowth: "30", eps: "50", pe: "35", probability: "25" }
    }
  };
}

function normalizeCompany(raw: Partial<Company>): Company {
  const base = blankCompany();
  const normalized = {
    ...base,
    ...raw,
    id: raw.id || uid(),
    scores: { ...base.scores, ...(raw.scores || {}) },
    financials: { ...base.financials, ...(raw.financials || {}) },
    valuation: {
      bear: { ...base.valuation.bear, ...(raw.valuation?.bear || {}) },
      base: { ...base.valuation.base, ...(raw.valuation?.base || {}) },
      bull: { ...base.valuation.bull, ...(raw.valuation?.bull || {}) }
    },
    risks: raw.risks || [],
    catalysts: raw.catalysts || [],
    reviews: raw.reviews || [],
    documents: raw.documents || [],
    codexReports: raw.codexReports || []
  };

  return {
    ...normalized,
    businessSummary: stripRawTrendlyneText(normalized.businessSummary),
    multibaggerCase: stripRawTrendlyneText(normalized.multibaggerCase),
    industryOpportunity: stripRawTrendlyneText(normalized.industryOpportunity),
    managementAssessment: stripRawTrendlyneText(normalized.managementAssessment),
    bullThesis: stripRawTrendlyneText(normalized.bullThesis),
    bearThesis: stripRawTrendlyneText(normalized.bearThesis),
    keyAssumptions: stripRawTrendlyneText(normalized.keyAssumptions),
    thesisKillers: stripRawTrendlyneText(normalized.thesisKillers),
    aiOutput: stripRawTrendlyneText(normalized.aiOutput),
    risks: normalized.risks.filter((item) => !looksLikeRawTrendlyneText(`${item.title} ${item.mitigation}`)),
    catalysts: normalized.catalysts.filter((item) => !looksLikeRawTrendlyneText(`${item.title} ${item.notes}`))
  };
}

function metricValue(company: Company, record: FundamentalsRecord | undefined, key: keyof Financials) {
  return record?.[key as keyof FundamentalsRecord] || company.financials[key];
}

function metricSet(company: Company, record?: FundamentalsRecord) {
  return {
    revenue: metricValue(company, record, "revenue"),
    profit: metricValue(company, record, "profit"),
    eps: metricValue(company, record, "eps"),
    pe: metricValue(company, record, "pe"),
    roe: metricValue(company, record, "roe"),
    roce: metricValue(company, record, "roce"),
    debtEquity: metricValue(company, record, "debtEquity"),
    promoterHolding: metricValue(company, record, "promoterHolding"),
    fiiHolding: metricValue(company, record, "fiiHolding"),
    diiHolding: metricValue(company, record, "diiHolding"),
    institutionalHolding: metricValue(company, record, "institutionalHolding"),
    salesGrowth: metricValue(company, record, "salesGrowth"),
    profitGrowth: metricValue(company, record, "profitGrowth"),
    opm: metricValue(company, record, "opm"),
    cfo: metricValue(company, record, "cfo"),
    currentPrice: metricValue(company, record, "currentPrice"),
    dvmDurability: metricValue(company, record, "dvmDurability"),
    dvmValuation: metricValue(company, record, "dvmValuation"),
    dvmMomentum: metricValue(company, record, "dvmMomentum"),
    analystScore: metricValue(company, record, "analystScore"),
    marketCap: record?.marketCap || company.marketCap
  };
}

function parseReportDate(value: string) {
  if (!value) return undefined;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[2].toLowerCase());
  if (month < 0) return undefined;
  return new Date(Number(match[3]), month, Number(match[1]));
}

function isLargeEstablishedCompany(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  return asNumber(m.marketCap) >= 50000 || asNumber(m.dvmDurability) >= 55;
}

function isMegaCapCompany(company: Company, record?: FundamentalsRecord) {
  return asNumber(metricSet(company, record).marketCap) >= 500000;
}

function isConglomerateCandidate(company: Company, record?: FundamentalsRecord) {
  const text = `${company.name} ${record?.companyName || ""} ${company.sector}`.toLowerCase();
  return isMegaCapCompany(company, record) && /reliance|industries|diversified|conglomerate|holding|tata|adani/.test(text);
}

function hasPerShareMismatch(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const price = asNumber(m.currentPrice);
  const pe = asNumber(m.pe);
  const eps = asNumber(m.eps);
  const impliedEps = price && pe ? price / pe : 0;
  return Boolean(impliedEps && eps) && Math.abs(eps - impliedEps) / impliedEps > 0.25;
}

function hasShareCountMismatch(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const marketCap = asNumber(m.marketCap);
  const price = asNumber(m.currentPrice);
  const profit = asNumber(m.profit);
  const eps = asNumber(m.eps);
  const marketSharesCr = marketCap && price ? marketCap / price : 0;
  const earningsSharesCr = profit && eps ? profit / eps : 0;
  return Boolean(marketSharesCr && earningsSharesCr) && Math.abs(marketSharesCr - earningsSharesCr) / marketSharesCr > 0.2;
}

function derivedPe(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const price = asNumber(m.currentPrice);
  const eps = asNumber(m.eps);
  return price > 0 && eps > 0 ? price / eps : 0;
}

function usablePe(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const pe = asNumber(m.pe);
  if (pe > 0) return pe;
  return derivedPe(company, record);
}

function isStaleFinancialRecord(record?: FundamentalsRecord) {
  const date = parseReportDate(record?.reportDate || "");
  if (!date) return Boolean(record && !record.reportDate);
  return Date.now() - date.getTime() > 540 * 24 * 60 * 60 * 1000;
}

function isInvalidCfo(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const cfo = asNumber(m.cfo);
  const revenue = asNumber(m.revenue);
  const marketCap = asNumber(m.marketCap);
  if (!m.cfo) return false;
  if (marketCap >= 10000 && Math.abs(cfo) > 0 && Math.abs(cfo) < 100) return true;
  return Boolean(revenue && Math.abs(cfo) > 0 && Math.abs(cfo) < revenue * 0.01);
}

function dataQualityReview(company: Company, record?: FundamentalsRecord, intelligence?: TrendlyneIntelligenceRecord): DataQualityReview {
  const m = metricSet(company, record);
  const largeEstablished = isLargeEstablishedCompany(company, record);
  const perShareMismatch = hasPerShareMismatch(company, record);
  const shareCountMismatch = hasShareCountMismatch(company, record);
  const cfoInvalid = isInvalidCfo(company, record);
  const peInvalid = Boolean(m.pe && asNumber(m.pe) <= 0);
  const opmInvalid = Boolean(largeEstablished && m.opm && asNumber(m.opm) < 0);
  const staleFinancials = isStaleFinancialRecord(record);
  const conglomerateNeedsSegments = isConglomerateCandidate(company, record);
  const p0: string[] = [];
  const p1: string[] = [];
  const notes: string[] = [];

  if (!record?.reportDate) p1.push("Core financial snapshot has no report date; every number must be labelled FY, TTM or quarter.");
  if (staleFinancials) p1.push(`Financial snapshot appears stale (${record?.reportDate || "undated"}). Pull latest annual/TTM/quarterly data before final scoring.`);
  if (perShareMismatch) p0.push("EPS, P/E and current price fail the per-share basis check. Possible bonus/split or stale EPS mismatch.");
  if (shareCountMismatch) p0.push("Market cap divided by price does not reconcile with profit divided by EPS. Share-count basis must be corrected.");
  if (peInvalid && derivedPe(company, record)) {
    p1.push(`Reported P/E ${m.pe}x is invalid; using price/EPS derived P/E ${formatNumber(derivedPe(company, record), 2)}x for valuation only.`);
  } else if (peInvalid) {
    p0.push(`Reported P/E ${m.pe}x is invalid and cannot be reconciled from price/EPS.`);
  }
  if (opmInvalid) {
    const proxy = netMarginProxy(company, record);
    p1.push(
      proxy
        ? `Operating margin ${m.opm}% failed validation; using net margin proxy ${formatNumber(proxy, 2)}% until EBITDA/operating-profit data is fetched.`
        : `Operating margin ${m.opm}% failed validation and needs EBITDA/operating-profit source data.`
    );
  }
  if (cfoInvalid) p1.push(`Operating cash-flow value "${m.cfo}" fails unit/magnitude validation. Suppress it and fetch the cash-flow statement.`);
  if (asNumber(m.profitGrowth) <= -20 && !hasExceptionalContext(intelligence)) {
    p1.push("Profit decline is material but exceptional-item/base-effect context was not found in the saved evidence.");
  }
  if (conglomerateNeedsSegments) {
    p1.push("Large diversified company: segment-level analysis is required before making a final multibagger/trap call.");
  }
  if (isMegaCapCompany(company, record)) {
    notes.push("Mega-cap framework active: use a compounder/re-rating lens instead of a small-cap 5x/10x multibagger lens.");
  }

  return { p0, p1, notes, perShareMismatch, shareCountMismatch, cfoInvalid, opmInvalid, peInvalid, staleFinancials, conglomerateNeedsSegments };
}

function metricPeriod(record?: FundamentalsRecord) {
  return record?.reportDate ? record.reportDate : "Undated/Unverified";
}

function timedMetric(value: string, unit = "", record?: FundamentalsRecord) {
  if (!value) return "-";
  return `${value}${unit ? ` ${unit}` : ""} (${metricPeriod(record)})`;
}

function validatedMetric(
  company: Company,
  record: FundamentalsRecord | undefined,
  key: keyof Financials,
  unit = "",
  options: { reason?: string } = {}
) {
  const review = dataQualityReview(company, record);
  const value = metricValue(company, record, key);
  if (key === "eps" && (review.perShareMismatch || review.shareCountMismatch)) return "N/V - failed share-basis validation";
  if (key === "pe" && review.peInvalid) {
    const derived = derivedPe(company, record);
    return derived ? `${formatNumber(derived, 2)} x (derived from current price/EPS; source P/E failed validation)` : "N/V - failed P/E validation";
  }
  if (key === "opm" && review.opmInvalid) return "N/V - failed margin validation";
  if (key === "cfo" && review.cfoInvalid) return "N/V - failed unit/magnitude validation";
  if (!value) return "N/V - missing";
  return `${timedMetric(value, unit, record)}${options.reason ? `; ${options.reason}` : ""}`;
}

function netMarginProxy(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const revenue = asNumber(m.revenue);
  const profit = asNumber(m.profit);
  return revenue > 0 && profit !== 0 ? (profit / revenue) * 100 : 0;
}

function marginEvidenceText(company: Company, record?: FundamentalsRecord) {
  const review = dataQualityReview(company, record);
  const proxy = netMarginProxy(company, record);
  if (review.opmInvalid && proxy) {
    return `Operating margin failed validation; net margin proxy is ${formatNumber(proxy, 2)}% from net profit/revenue. Fetch EBITDA/operating profit before final scoring.`;
  }
  return validatedMetric(company, record, "opm", "%");
}

function ownershipLines(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const promoter = asNumber(m.promoterHolding);
  const fii = asNumber(m.fiiHolding);
  const dii = asNumber(m.diiHolding);
  const publicOther = promoter || fii || dii ? Math.max(0, 100 - promoter - fii - dii) : 0;
  const lines = [
    `Promoter: ${m.promoterHolding || "N/V"}%`,
    `FII: ${m.fiiHolding || "N/V"}%`,
    `DII: ${m.diiHolding || "N/V"}%${m.institutionalHolding ? " (mutual funds/other institutions may be included here depending on source taxonomy)" : ""}`,
    publicOther ? `Public/other implied: ${formatNumber(publicOther)}%` : "Public/other implied: N/V"
  ];
  if (m.institutionalHolding) {
    lines.push(`Other institutions/MF memo line: ${m.institutionalHolding}% - do not add this to FII/DII without taxonomy confirmation.`);
  }
  return lines;
}

function inferredSector(company: Company, record?: FundamentalsRecord) {
  const text = `${company.name} ${record?.companyName || ""} ${company.ticker}`.toLowerCase();
  if (/cg power|cgpower|transformer|industrial solutions|motors?|switchgear/.test(text)) return "Electrical equipment, industrial systems and power components";
  if (/reliance/.test(text)) return "Diversified energy, telecom, retail and new energy";
  if (/cdsl|depository/.test(text)) return "Capital-market infrastructure";
  if (/bank|finance|nbfc|financial/.test(text)) return "Financial services";
  if (/pharma|health|hospital|medical/.test(text)) return "Healthcare";
  if (/chemical|speciality|specialty/.test(text)) return "Chemicals";
  return company.sector && company.sector !== "Equity" ? company.sector : "Industry classification needs verification";
}

function businessModelDraft(company: Company, record?: FundamentalsRecord) {
  const sector = inferredSector(company, record);
  const text = `${company.name} ${record?.companyName || ""} ${company.ticker}`.toLowerCase();
  if (/cg power|cgpower|transformer|industrial solutions|motors?|switchgear/.test(text)) {
    return `${record?.companyName || company.name} is an electrical equipment and industrial systems company with exposure to power systems, industrial motors, drives, automation and allied infrastructure/electrification demand. The institutional question is whether order growth, margin quality, working-capital discipline and return on capital can sustain the current valuation.`;
  }
  if (/reliance/.test(text)) {
    return `${record?.companyName || company.name} is a diversified conglomerate across energy/O2C, oil and gas, retail, digital/Jio and new energy. A serious report must evaluate each segment separately because consolidated ratios hide very different growth, margin and capital-intensity profiles.`;
  }
  if (/cdsl|depository/.test(text)) {
    return `${record?.companyName || company.name} is a capital-market infrastructure business tied to demat accounts, transaction volumes, issuer services and market participation. The key research issue is whether structural market deepening can offset cyclicality and valuation risk.`;
  }
  return `${record?.companyName || company.name} operates in ${sector}. The report should verify products, customers, end-markets, revenue mix, margin drivers and competitive position from annual reports and investor presentations.`;
}

function meaningfulRisks(company: Company) {
  return company.risks.filter((risk) => risk.title.trim() && !shouldReplaceGeneratedItem(`${risk.title} ${risk.mitigation}`));
}

function meaningfulCatalysts(company: Company) {
  return company.catalysts.filter((catalyst) => catalyst.title.trim() && !shouldReplaceGeneratedItem(`${catalyst.title} ${catalyst.notes}`));
}

function hasExceptionalContext(intelligence?: TrendlyneIntelligenceRecord) {
  const text = [intelligence?.news, intelligence?.events, intelligence?.documents].filter(Boolean).join("\n");
  return /exceptional|one[- ]off|base effect|impairment|write[- ]off|extraordinary|transcript|concall|earnings call/i.test(text);
}

function needsVerificationItems(company: Company, record?: FundamentalsRecord, intelligence?: TrendlyneIntelligenceRecord) {
  const m = metricSet(company, record);
  const review = dataQualityReview(company, record, intelligence);
  const items: string[] = [...review.p0, ...review.p1];

  if (asNumber(m.profitGrowth) <= -20 && hasExceptionalContext(intelligence)) {
    items.push("Profit decline has possible exceptional-item/base-effect context in the evidence pack; show reported and adjusted growth separately.");
  }
  if (review.notes.length) {
    items.push(...review.notes);
  }

  return Array.from(new Set(items));
}

function sanityCheckItems(company: Company, record?: FundamentalsRecord, intelligence?: TrendlyneIntelligenceRecord) {
  const review = dataQualityReview(company, record, intelligence);
  const items = needsVerificationItems(company, record, intelligence);
  const passed: string[] = [];

  if (!review.p0.length) {
    passed.push("No major blue-chip sanity contradiction detected from the current metric set.");
  }
  if (record?.reportDate) {
    passed.push(`Primary metric period is ${record.reportDate}.`);
  }
  if (hasExceptionalContext(intelligence)) {
    passed.push("Recent source text contains possible exceptional-item, base-effect or transcript context.");
  }

  return items.length ? items : passed;
}

function sourceCoverageRows(company: Company, record?: FundamentalsRecord, intelligence?: TrendlyneIntelligenceRecord) {
  const review = dataQualityReview(company, record, intelligence);
  const rows: Array<[string, string]> = [
    ["Market price", company.financials.currentPrice ? `Current price captured: INR ${company.financials.currentPrice}` : "Not captured for this company"],
    [
      "Structured fundamentals",
      record
        ? `Available for ${record.companyName || company.name}; period ${record.reportDate || "Undated/Unverified"}; imported ${new Date(
            record.importedAt
          ).toLocaleString("en-IN")}`
        : "Missing - sync fundamentals before report generation"
    ],
    [
      "Market intelligence",
      intelligence
        ? `Available; imported ${new Date(intelligence.importedAt).toLocaleString("en-IN")}`
        : "Missing - sync full market-intelligence pack"
    ],
    [
      "Ownership",
      record?.promoterHolding || record?.fiiHolding || record?.diiHolding
        ? `Promoter/FII/DII captured: ${record?.promoterHolding || "-"}% / ${record?.fiiHolding || "-"}% / ${record?.diiHolding || "-"}%`
        : "Missing - fetch latest shareholding from company/exchange filing"
    ],
    [
      "Valuation basis",
      review.peInvalid && derivedPe(company, record)
        ? `Raw P/E failed validation; valuation uses derived P/E ${formatNumber(derivedPe(company, record), 2)}x from price/EPS`
        : usablePe(company, record)
          ? `Usable P/E ${formatNumber(usablePe(company, record), 2)}x`
          : "Missing - need valid current price and EPS/P/E"
    ],
    [
      "Margin and cash-flow basis",
      `${marginEvidenceText(company, record)}; CFO ${validatedMetric(company, record, "cfo", "INR crore")}`
    ]
  ];

  return rows;
}

function scrubReportText(value: string) {
  if (!value.trim()) return "";
  if (looksLikeRawTrendlyneText(value)) return "";
  return value
    .split(/\r?\n/)
    .filter((line) => !isRawEvidenceLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function savedResearchText(value: string, fallback: string) {
  return scrubReportText(value) || fallback;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function looksLikeMarkdown(value: string) {
  return /^#{1,3}\s|\n#{1,3}\s|\*\*[^*\n]+\*\*|\n\s*[-*]\s|\n\|\s?[^\n|]+\|/.test(value);
}

function inlineMarkdownHtml(value: string) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function markdownTableHtml(lines: string[]) {
  const rows = lines
    .map((line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^[-: ]*$/.test(cell)));
  if (!rows.length) return "";
  return `<table>${rows
    .map((cells, index) => {
      const tag = index === 0 ? "th" : "td";
      return `<tr>${cells.map((cell) => `<${tag}>${inlineMarkdownHtml(cell)}</${tag}>`).join("")}</tr>`;
    })
    .join("")}</table>`;
}

function markdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const body: string[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let ordered: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      body.push(`<p>${inlineMarkdownHtml(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushLists = () => {
    if (bullets.length) {
      body.push(`<ul>${bullets.map((item) => `<li>${inlineMarkdownHtml(item)}</li>`).join("")}</ul>`);
      bullets = [];
    }
    if (ordered.length) {
      body.push(`<ol>${ordered.map((item) => `<li>${inlineMarkdownHtml(item)}</li>`).join("")}</ol>`);
      ordered = [];
    }
  };

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      flushParagraph();
      flushLists();
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      flushParagraph();
      flushLists();
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      body.push(markdownTableHtml(tableLines));
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushLists();
      const level = heading[1].length;
      body.push(`<h${level + 1} class="md-h${level}">${inlineMarkdownHtml(heading[2])}</h${level + 1}>`);
      index += 1;
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      ordered = [];
      bullets.push(bullet[1]);
      index += 1;
      continue;
    }

    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      bullets = [];
      ordered.push(numbered[1]);
      index += 1;
      continue;
    }

    flushLists();
    paragraph.push(line);
    index += 1;
  }

  flushParagraph();
  flushLists();
  return body.join("\n");
}

function reportBodyHtml(reportText: string) {
  return looksLikeMarkdown(reportText)
    ? `<div class="report-body">${markdownToHtml(reportText)}</div>`
    : `<div class="memo">${nl2br(reportText)}</div>`;
}

function printableTable(rows: Array<[string, string | number]>) {
  return `<table>${rows
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "-")}</td></tr>`)
    .join("")}</table>`;
}

function printableList(items: string[]) {
  return items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>No entries recorded.</p>";
}

function printableSection(title: string, body: string) {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function buildPrintableReportHtml(company: Company, trendlyneIntel?: TrendlyneIntelligenceRecord, record?: FundamentalsRecord) {
  const f = company.financials;
  const generatedAt = new Date().toLocaleString("en-IN");
  const reportText =
    company.codexReports?.[0]?.content ||
    scrubReportText(company.aiOutput) ||
    "No final stock research report has been imported for this company yet.";
  const financialRows: Array<[string, string]> = [
    ["Revenue", validatedMetric(company, record, "revenue", "INR crore")],
    ["Net profit", validatedMetric(company, record, "profit", "INR crore")],
    ["EPS", validatedMetric(company, record, "eps", "INR")],
    ["P/E", validatedMetric(company, record, "pe", "x")],
    ["ROE", validatedMetric(company, record, "roe", "%")],
    ["ROCE", validatedMetric(company, record, "roce", "%")],
    ["Debt/Equity", validatedMetric(company, record, "debtEquity", "x")],
    ["Sales growth", validatedMetric(company, record, "salesGrowth", "%")],
    ["Profit growth", validatedMetric(company, record, "profitGrowth", "%")],
    ["Operating margin / margin evidence", marginEvidenceText(company, record)],
    ["Operating cash flow", validatedMetric(company, record, "cfo", "INR crore")],
    ["Current price", validatedMetric(company, record, "currentPrice", "INR")],
    ["Durability score", f.dvmDurability || "N/A"],
    ["Valuation score", f.dvmValuation || "N/A"],
    ["Momentum score", f.dvmMomentum || "N/A"],
    ["Analyst score", f.analystScore || "N/A"]
  ];
  const noteRows = [
    company.businessSummary ? ["Business summary", readerSafeText(company.businessSummary)] : null,
    company.industryOpportunity ? ["Industry opportunity", readerSafeText(company.industryOpportunity)] : null,
    company.managementAssessment ? ["Management assessment", readerSafeText(company.managementAssessment)] : null
  ].filter(Boolean) as Array<[string, string]>;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(company.name)} - IMRS Research Report</title>
  <style>
    @page { margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #102019; font-family: Arial, Helvetica, sans-serif; line-height: 1.45; }
    header { border-bottom: 3px solid #137b5d; padding-bottom: 14px; margin-bottom: 18px; }
    h1 { margin: 0 0 6px; font-size: 30px; }
    h2 { margin: 0 0 10px; font-size: 18px; color: #0c634b; }
    p { margin: 0 0 10px; }
    section { break-inside: avoid; border: 1px solid #d7e1dc; border-radius: 8px; padding: 14px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-top: 1px solid #d7e1dc; padding: 8px; vertical-align: top; text-align: left; }
    th { width: 34%; color: #667670; font-size: 12px; text-transform: uppercase; }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li { margin-bottom: 5px; }
    .meta { color: #667670; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
    .stat { border: 1px solid #d7e1dc; border-radius: 8px; padding: 12px; }
    .stat span { display: block; color: #667670; font-size: 12px; }
    .stat strong { display: block; margin-top: 6px; font-size: 18px; }
    .memo { white-space: pre-wrap; }
    .report-body h2.md-h1 { font-size: 22px; color: #06251b; margin: 14px 0 8px; }
    .report-body h3.md-h2 { font-size: 17px; color: #0c634b; margin: 14px 0 6px; }
    .report-body h4.md-h3 { font-size: 14px; color: #12352b; margin: 10px 0 5px; }
    .report-body table th { width: auto; background: #dff2ea; color: #06251b; text-transform: none; font-size: 13px; }
    .report-body table th, .report-body table td { border: 1px solid #c6d8d0; }
    .report-body ul, .report-body ol { margin: 6px 0 10px; }
    .disclaimer { color: #667670; font-size: 12px; }
    @media print {
      button { display: none; }
      .grid { grid-template-columns: repeat(3, 1fr); }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(company.name)}</h1>
    <div class="meta">${escapeHtml(company.ticker || "-")} | ${escapeHtml(company.sector || "-")} | Market cap INR ${escapeHtml(
      company.marketCap || "-"
    )} cr | Generated ${escapeHtml(generatedAt)}</div>
    <p class="disclaimer">IMRS research support only. Verify primary filings before making any investment decision.</p>
  </header>

  <div class="grid">
    <div class="stat"><span>Ticker</span><strong>${escapeHtml(company.ticker || "-")}</strong></div>
    <div class="stat"><span>Sector</span><strong>${escapeHtml(company.sector || "-")}</strong></div>
    <div class="stat"><span>Market cap</span><strong>INR ${escapeHtml(company.marketCap || "-")} cr</strong></div>
  </div>

  ${printableSection("Stock research report", reportBodyHtml(reportText))}
  ${printableSection("Financial snapshot", printableTable(financialRows))}
  ${printableSection("Ownership", printableList(ownershipLines(company, record)))}
  ${noteRows.length ? printableSection("Saved analyst notes", printableTable(noteRows)) : ""}
  ${printableSection(
    "Recorded risks",
    meaningfulRisks(company).length
      ? printableTable(meaningfulRisks(company).map((risk) => [risk.title, `${risk.probability}/${risk.impact}. ${risk.mitigation}`]))
      : "<p>No risks recorded.</p>"
  )}
  ${printableSection(
    "Recorded catalysts",
    meaningfulCatalysts(company).length
      ? printableTable(meaningfulCatalysts(company).map((catalyst) => [catalyst.title, `${catalyst.status}; ${catalyst.date || "No date"}. ${catalyst.notes}`]))
      : "<p>No catalysts recorded.</p>"
  )}
  ${printableSection(
    "Documents",
    company.documents.length
      ? printableTable(company.documents.map((document) => [readerSafeText(document.name), `${readerSafeText(document.type)}; ${readerSafeText(document.status)}`]))
      : "<p>No documents recorded.</p>"
  )}
  ${printableSection(
    "Quarterly reviews",
    company.reviews.length ? printableTable(company.reviews.map((review) => [review.quarter, `${review.verdict}. ${review.notes}`])) : "<p>No reviews recorded.</p>"
  )}
</body>
</html>`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function scoreFromDvm(value: string, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? clampScore(numberValue / 10) : fallback;
}

function compactText(value: string, max = 900) {
  const clean = value.replace(/\n{3,}/g, "\n\n").trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}\n...` : clean;
}

function hasMeaningfulText(value: string) {
  const clean = value.trim().toLowerCase();
  return Boolean(clean) && !clean.includes("no data returned");
}

function shouldAutoFillText(value: string) {
  const clean = value.trim().toLowerCase();
  if (!clean) return true;
  if (looksLikeRawTrendlyneText(value)) return true;
  return [
    "replace this sample",
    "map industry size",
    "assess promoter",
    "build the strongest",
    "list every assumption",
    "define evidence requiring",
    "not yet entered",
    "add primary-source evidence",
    "instrument token"
  ].some((placeholder) => clean.includes(placeholder));
}

function setIfDraft(current: string, next: string) {
  return shouldAutoFillText(current) && hasMeaningfulText(next) ? next : current;
}

function looksLikeRawTrendlyneText(value: string) {
  return /stockHeaders:|tableHeaders:|tableData:|stockData:|newsList:|summaryData:|chartData:|NSEcode\s*\|\s*BSEcode|currentPrice\s*\|\s*dayChangeP|unique_name\s*\|\s*type\s*\|\s*name|isCurtail:\s*(True|False)/i.test(
    value
  );
}

function isRawEvidenceLine(line: string) {
  return (
    /^(stockHeaders|tableHeaders|tableData|stockData|newsList|summaryData|chartData|headers?):/i.test(line) ||
    /NSEcode\s*\|\s*BSEcode|currentPrice\s*\|\s*dayChangeP|unique_name\s*\|\s*type\s*\|\s*name|descriptionHTML|postTypeNumber|audioUrl|imageUrl/i.test(line) ||
    /^\s*[\]\[]/.test(line)
  );
}

function stripRawTrendlyneText(value: string) {
  return looksLikeRawTrendlyneText(value) ? "" : value;
}

function readerSafeText(value: string) {
  return value
    .replace(/^Trendlyne\s+/i, "")
    .replace(/\bTrendlyne\b/gi, "Market intelligence")
    .replace(/\bNSE\b/gi, "Exchange")
    .replace(/\bMCP\b/gi, "data")
    .replace(/\bAPI\b/gi, "data feed")
    .replace(/\bpayload\b/gi, "source text")
    .trim();
}

function shouldReplaceGeneratedItem(value: string) {
  return looksLikeRawTrendlyneText(value) || /trendlyne|growth delivery watch|momentum recovery trigger|negative profit growth|weak capital efficiency|valuation risk/i.test(value);
}

function metric(value: string, suffix = "") {
  return value ? `${value}${suffix}` : "-";
}

function evidenceMetric(value: string, suffix = "", missing = "source missing") {
  return value && value !== "-" ? `${value}${suffix}` : missing;
}

function ratioScore(value: string, good: number, okay: number, higherIsBetter = true) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || !value) return 5;
  if (higherIsBetter) return numberValue >= good ? 8 : numberValue >= okay ? 6 : 4;
  return numberValue <= good ? 8 : numberValue <= okay ? 6 : 4;
}

function growthLabel(value: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || !value) return "unverified";
  if (numberValue >= 20) return "strong";
  if (numberValue >= 10) return "moderate";
  if (numberValue >= 0) return "slow";
  return "negative";
}

function scoreWord(value: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || !value) return "not scored";
  if (numberValue >= 70) return "strong";
  if (numberValue >= 50) return "average";
  return "weak";
}

function buildBusinessSummary(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const overviewText = cleanTrendlyneIntel("Overview and DVM", intelligence.overview);
  const overview = hasMeaningfulText(overviewText) ? compactText(overviewText, 260) : "";

  return `${businessModelDraft(company, record)}

Market-intelligence support signal:
${overview || "No clean business-description evidence was returned; use annual report and investor presentation for source-level verification."}

Evidence snapshot: market cap INR ${metric(record.marketCap || company.marketCap, " cr")}; P/E ${usablePe(company, record) ? formatNumber(usablePe(company, record), 2) : "N/V"}; ROE ${metric(
    record.roe,
    "%"
  )}; ROCE ${metric(record.roce, "%")}; Debt/Equity ${metric(record.debtEquity)}; promoter holding ${metric(
    record.promoterHolding,
    "%"
  )}.`;
}

function buildIndustryOpportunity(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const sectorLine = `${inferredSector(company, record)} exposure needs to be tested for industry growth, regulation, cyclicality and competition.`;
  const recentEvidence = compactText(
    [cleanTrendlyneIntel("News and announcements", intelligence.news), cleanTrendlyneIntel("Corporate events", intelligence.events)]
      .filter(hasMeaningfulText)
      .join("\n\n"),
    420
  );
  return `${sectorLine}

Market-intelligence signal: sales growth is ${growthLabel(record.salesGrowth)} at ${evidenceMetric(record.salesGrowth, "%")}; DVM momentum is ${metric(
    record.dvmMomentum
  )} (${scoreWord(record.dvmMomentum)}).${recentEvidence ? `\n\nRecent evidence:\n${recentEvidence}` : ""}`;
}

function buildManagementAssessment(record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const ownership = `Promoter holding ${metric(record.promoterHolding, "%")}; FII ${metric(record.fiiHolding, "%")}; DII ${metric(
    record.diiHolding,
    "%"
  )}; institutional holding ${metric(record.institutionalHolding, "%")}.`;
  const sastText = cleanTrendlyneIntel("Insider / SAST", intelligence.sast);
  const sast = hasMeaningfulText(sastText) ? compactText(sastText, 360) : "No meaningful SAST/insider text was returned in this sync.";
  return `${ownership}

Governance read-through: high promoter ownership can support alignment, but it is not proof of governance quality. Review pledges, related-party transactions, auditor notes, capital allocation and insider/SAST changes.

Ownership and insider evidence:
${sast}`;
}

function buildMultibaggerCase(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const megaCap = isMegaCapCompany(company, record);
  const positives = [
    Number(record.salesGrowth) >= 15 ? `sales growth is healthy at ${record.salesGrowth}%` : "",
    Number(record.roce) >= 15 ? `ROCE is acceptable/strong at ${record.roce}%` : "",
    Number(record.debtEquity) <= 0.5 && record.debtEquity ? `balance sheet leverage is controlled at ${record.debtEquity} debt/equity` : "",
    Number(record.promoterHolding) >= 45 ? `promoter holding is meaningful at ${record.promoterHolding}%` : "",
    Number(record.dvmDurability) >= 60 ? `durability score is supportive at ${record.dvmDurability}` : "",
    hasMeaningfulText(intelligence.news) ? "recent news flow provides items to investigate as possible catalysts" : ""
  ].filter(Boolean);

  return megaCap
    ? `${record.companyName || company.name} is a mega-cap and should not be judged with a small-cap 5x/10x screen. Treat it as a compounder/re-rating candidate: the question is whether segment-level earnings, free cash flow and ROCE can improve enough to create attractive risk-adjusted returns from the current valuation.

Current supporting evidence:
${positives.length ? positives.map((item) => `- ${item}`).join("\n") : "- Saved data does not yet show enough high-quality compounder evidence."}

What must be proven next: segment-wise growth and margin improvement in O2C/Oil & Gas, Retail, Digital/Jio, New Energy and Others; cash conversion; disciplined capex; governance; and valuation support.`
    : `${record.companyName || company.name} can be treated as a possible multibagger candidate only if the business can compound earnings for several years without serious governance or balance-sheet deterioration.

Current supporting evidence:
${positives.length ? positives.map((item) => `- ${item}`).join("\n") : "- Saved data does not yet show enough high-quality multibagger evidence."}

What must be proven next: large growth runway, durable moat, improving ROCE/ROE, cash conversion, reinvestment opportunity, management execution and valuation discipline.`;
}

function buildBullThesis(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const catalystText = [cleanTrendlyneIntel("News and announcements", intelligence.news), cleanTrendlyneIntel("Corporate events", intelligence.events)]
    .filter(hasMeaningfulText)
    .join("\n\n");
  return `Bull case: ${record.companyName || company.name} becomes attractive if revenue growth remains ${growthLabel(record.salesGrowth)}, profitability recovers or improves, capital efficiency rises, and the market gains confidence in the durability of earnings.

Evidence to support the upside case:
- Sales growth: ${evidenceMetric(record.salesGrowth, "%")}.
- Profit growth: ${metric(record.profitGrowth, "%")}.
- ROE/ROCE: ${metric(record.roe, "%")} / ${metric(record.roce, "%")}.
- DVM durability/valuation/momentum: ${metric(record.dvmDurability)} / ${metric(record.dvmValuation)} / ${metric(record.dvmMomentum)}.

Catalyst watch:
${compactText(catalystText, 380) || "Track quarterly results, management commentary, order wins, margin recovery and institutional ownership changes."}`;
}

function buildBearThesis(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const review = dataQualityReview(company, record, intelligence);
  const pe = usablePe(company, record);
  const concerns = [
    Number(record.profitGrowth) < 0 ? `profit growth is negative at ${record.profitGrowth}%` : "",
    Number(record.roce) > 0 && Number(record.roce) < 12 ? `ROCE is modest at ${record.roce}%` : "",
    Number(record.roe) > 0 && Number(record.roe) < 12 ? `ROE is modest at ${record.roe}%` : "",
    pe > 35 ? `valuation may already price in optimism at ${formatNumber(pe, 2)}x earnings` : "",
    Number(record.dvmMomentum) > 0 && Number(record.dvmMomentum) < 45 ? `momentum score is weak at ${record.dvmMomentum}` : "",
    /sell|disposal|pledge|sast|insider/i.test(intelligence.sast) ? "insider/SAST activity needs forensic review" : ""
  ].filter(Boolean);

  if (review.p0.length) {
    return `Bear case: verdict withheld until evidence confidence improves. Do not label the stock a value trap from failed or stale metrics.

Failed checks:
${review.p0.map((item) => `- ${item}`).join("\n")}

Once the data is corrected, reassess whether weakness is structural, cyclical, valuation-driven, or caused by exceptional/base-effect items.`;
  }

  return `Bear case: the stock may become a value trap or momentum trap if growth slows, margins compress, ROCE/ROE remain weak, or valuation is high relative to actual earnings delivery.

Current concerns:
${concerns.length ? concerns.map((item) => `- ${item}`).join("\n") : "- No single fatal concern was detected from the available evidence, but primary filings still need review."}

Trap test: avoid treating a popular name as a multibagger unless cash flow, capital allocation, governance and valuation all support the story.`;
}

function buildKeyAssumptions(company: Company, record: FundamentalsRecord) {
  const pe = usablePe(company, record);
  return `Key assumptions to verify:
- ${
    record.salesGrowth && record.salesGrowth !== "-"
      ? `Sales can compound at or above ${record.salesGrowth}% without excessive working-capital stress.`
      : "Sales growth source must be fetched and verified; if growth is positive, test whether it can compound without excessive working-capital stress."
  }
- Profit growth improves from ${metric(record.profitGrowth, "%")} and is not driven only by one-off items.
- ROE and ROCE improve from ${metric(record.roe, "%")} / ${metric(record.roce, "%")}.
- Debt/equity remains controlled near ${metric(record.debtEquity)}.
- Promoter and institutional ownership remain stable.
- Current valuation of ${pe > 0 ? `${formatNumber(pe, 2)}x earnings` : "the validated/derived P/E"} leaves enough upside for execution risk.`;
}

function buildThesisKillers(record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const sastText = cleanTrendlyneIntel("Insider / SAST", intelligence.sast);
  return `Thesis killers:
- Two or more quarters of revenue slowdown without a clear temporary reason.
- Profit growth remains negative while valuation stays elevated.
- ROCE/ROE deteriorate further from ${metric(record.roce, "%")} / ${metric(record.roe, "%")}.
- Operating cash flow fails to track reported profits.
- Promoter pledge, large insider selling, adverse SAST activity, auditor concerns or governance red flags appear.
- DVM durability/momentum weakens materially.
- Public filings contradict the saved metrics used in this draft.${hasMeaningfulText(sastText) ? `\n\nOwnership/SAST evidence to monitor:\n${compactText(sastText, 260)}` : ""}`;
}

function buildAnalystPrompt(company: Company) {
  return `Act as an institutional equity research analyst. Using the source-backed data already saved in IMRS for ${company.name}, produce a balanced investment memo covering business quality, industry runway, management, financial strength, valuation, catalysts, risks, multibagger potential and potential trap warnings.

Strict rules:
- The final reader-facing report must discuss only the stock. Do not mention provider names, connector names, backend systems, APIs, MCP, raw sync errors, payloads, OCR fragments, JSON, table headers or data-pipeline problems.
- If evidence is incomplete or contradictory, convert that into investment language such as low valuation confidence, ownership risk, margin evidence needs confirmation, or verdict withheld until share-basis math is reconciled.
- Do not leave a major report section blank merely because one evidence source is incomplete. Triangulate from the company identity, structured fundamentals, market price, ownership data and derived calculations, then label confidence.
- Use the evidence hierarchy internally: audited filings and exchange filings first, structured fundamentals and ownership data second, market price third, derived calculations fourth. Never mix these without labelling the basis.
- When a raw metric fails validation, use a labelled proxy if possible: P/E may be derived from price/EPS; net margin may be derived from net profit/revenue; share count may be cross-checked from market cap/price and profit/EPS. Put unreconciled items under Needs Verification.
- Business and industry sections must describe the actual business, customers, end-markets, margin drivers and competitive position. Do not substitute ownership tables, technicals or raw MCP headers for business analysis.
- Run a sanity check before the executive verdict. If an established company shows negative operating margin, a massive profit drop, unusually weak ROE/ROCE or contradictory metrics, ask whether exceptional items, base effects or data extraction errors explain it.
- Never output floating financial figures. Tie every revenue, EPS, growth, margin, cash-flow and ownership metric to Q/FY/TTM, or label it Undated/Unverified next to the number.
- Before calling a stock a value trap, scan recent news, filings, corporate events and transcripts for exceptional items, base effects and one-off charges.
- Enforce units. If a metric lacks unit context, suppress it from the primary financial table and move it to Needs Verification.
- Reconcile EPS, P/E and price. Price divided by P/E must broadly match EPS; market-cap divided by price must broadly match profit divided by EPS. If not, flag possible bonus/split/stale EPS and withhold valuation confidence.
- For companies above INR 500,000 crore market cap, switch from a small-cap 5x/10x multibagger lens to a compounder/re-rating lens. For other large caps, still assess multibagger potential but require stronger valuation and growth proof.
- For conglomerates or diversified businesses, require segment analysis before a final verdict.
- Valuation must never use negative P/E or negative implied target prices. If EPS or P/E is invalid, state that the scenario is not valid and rebuild from validated or derived inputs.
- Always include a provisional investment view, evidence confidence rating, and explicit next evidence requests even when some data is unavailable.
- Do not output Trap probability 100/100 or Multibagger probability 100/100. Use calibrated 5-95 ranges and withhold verdict when P0 data checks fail.
- Do not repeat raw payloads, headers, OCR fragments or truncated table dumps in the final report. Summarize only clean evidence and put messy source output under Needs Verification.
- Separate facts from assumptions and do not give a buy/sell recommendation unless the evidence is sufficient.`;
}

function buildResearchReview(record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  return {
    quarter: new Date(record.importedAt || intelligence.importedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    verdict: "Unchanged",
    notes: `Data sync created a first-pass research draft. Verify annual report, latest quarterly results, concall commentary, cash flow and governance before changing position size.`
  };
}

function extractSummaryHoldings(text: string) {
  const matches = Array.from(text.matchAll(/\["([^"]+)",\s*(-?\d+(?:\.\d+)?)/g));
  return matches
    .filter((match) => !["Type", "Quarter"].includes(match[1]))
    .slice(0, 8)
    .map((match) => `${match[1]}: ${formatNumber(match[2])}%`);
}

function extractChartTrend(text: string, label: string) {
  const section = new RegExp(`${label}:([\\s\\S]*?)(?:\\n\\s{2}[A-Z][A-Za-z /]+:|\\n[a-zA-Z]+:|$)`, "i").exec(text)?.[1] || "";
  const rows = Array.from(section.matchAll(/\["([^"]+)",\s*(-?\d+(?:\.\d+)?)/g)).map((match) => ({
    quarter: match[1],
    value: Number(match[2])
  }));
  if (rows.length < 2) return "";
  const first = rows[0];
  const latest = rows[rows.length - 1];
  const change = latest.value - first.value;
  const direction = change > 0.05 ? "increased" : change < -0.05 ? "decreased" : "remained broadly stable";
  return `${label}: ${latest.value}% in ${latest.quarter}, ${direction} from ${first.value}% in ${first.quarter}.`;
}

function extractStockIdentity(text: string) {
  const csv = /stockData:\s*\n\s{2}([^\n]+,\s*[A-Z0-9-]+,\s*\d+,[^\n]+)/i.exec(text)?.[1];
  if (csv) {
    const parts = csv.split(",").map((part) => part.trim());
    return {
      name: parts[0] || "",
      ticker: parts[1] || "",
      durability: parts[6] || "",
      valuation: parts[7] || "",
      momentum: parts[8] || ""
    };
  }
  const name = /get_full_name:\s*([^\n]+)/i.exec(text)?.[1]?.trim() || "";
  const ticker = /NSEcode:\s*([^\n]+)/i.exec(text)?.[1]?.trim() || "";
  return {
    name,
    ticker,
    durability: /d_value:\s*([-\d.]+)/i.exec(text)?.[1] || "",
    valuation: /v_value:\s*([-\d.]+)/i.exec(text)?.[1] || "",
    momentum: /m_value:\s*([-\d.]+)/i.exec(text)?.[1] || ""
  };
}

function extractTechnicalRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("|") && !/^name\s*\|/i.test(line))
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 5 && parts[0] && parts[0] !== "None")
    .slice(0, 8)
    .map((parts) => `${parts[0]}: ${parts[1]} - ${parts[3] && parts[3] !== "None" ? parts[3] : parts[4]}`);
}

function extractPricePerformance(text: string) {
  const labels = ["day", "week", "month", "sixMonth", "oneYear", "twoYear", "threeYear"];
  return labels
    .map((label) => {
      const section = new RegExp(`${label}:([\\s\\S]*?)(?:\\n\\s{2}[a-zA-Z]+:|$)`).exec(text)?.[1] || "";
      const name = /name:\s*([^\n]+)/i.exec(section)?.[1]?.trim();
      const change = /changePercentSafe:\s*(-?\d+(?:\.\d+)?)/i.exec(section)?.[1] || /changePercent:\s*(-?\d+(?:\.\d+)?)/i.exec(section)?.[1];
      if (!name || !change) return "";
      return `${name}: ${formatNumber(change)}%`;
    })
    .filter(Boolean);
}

function extractNewsRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Z0-9-]+\s*\|/.test(line) && !/^NSEcode\s*\|/i.test(line))
    .slice(0, 5)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const date = parts[15] ? parts[15].slice(0, 10) : "";
      const title = parts[16] || parts[9] || parts[0];
      const description = parts[17] || "";
      return `${date ? `${date}: ` : ""}${title}${description && description !== title ? ` - ${description}` : ""}`;
    });
}

function extractDocumentRows(text: string) {
  const primaryTicker =
    /\bNSEcode\s*\|\s*BSEcode[\s\S]*?\n\s*([A-Z0-9-]+)\s*\|/i.exec(text)?.[1] ||
    /NSEcode:\s*([A-Z0-9-]+)/i.exec(text)?.[1] ||
    "";
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Z0-9-]+\s*\|/.test(line) && !/^NSEcode\s*\|/i.test(line))
    .filter((line) => !primaryTicker || line.startsWith(`${primaryTicker} |`) || line.startsWith(`${primaryTicker}|`))
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const date = parts.find((part) => /^\d{4}-\d{2}-\d{2}/.test(part))?.slice(0, 10) || "";
      const title =
        parts.find((part) => /annual report|investor presentation|presentation|transcript|concall|quarter|result|filing|notice|resolution/i.test(part)) ||
        parts.find((part) => part.length > 25 && !/^https?:/i.test(part)) ||
        "";
      return title ? `${date ? `${date}: ` : ""}${title}` : "";
    })
    .filter(Boolean)
    .slice(0, 8);
}

function extractTableRows(text: string, maxRows = 5) {
  return Array.from(text.matchAll(/\[([^\[\]\n]+)\]/g))
    .map((match) => match[1].split(",").map((part) => part.replace(/^"|"$/g, "").trim()))
    .filter((parts) => parts.length >= 4 && !parts[0].includes("Quarter") && !parts[0].includes("Type"))
    .slice(0, maxRows)
    .map((parts) => parts.filter(Boolean).slice(0, 7).join(" | "));
}

function cleanTrendlyneIntel(title: string, value: string) {
  if (!hasMeaningfulText(value)) return "No useful market-intelligence data returned for this section.";
  const lowerTitle = title.toLowerCase();
  const identity = extractStockIdentity(value);
  const lines: string[] = [];

  if (lowerTitle.includes("overview")) {
    const holdings = extractSummaryHoldings(value);
    const technicalRows = extractTechnicalRows(value);
    if (holdings.length) lines.push("Ownership snapshot:", ...holdings.map((item) => `- ${item}`));
    if (technicalRows.length) lines.push("", "Key technical signals:", ...technicalRows.map((item) => `- ${item}`));
  } else if (lowerTitle.includes("technical")) {
    if (identity.name) lines.push(`${identity.name} (${identity.ticker})`);
    if (identity.durability || identity.valuation || identity.momentum) {
      lines.push(`DVM: durability ${metric(identity.durability)}, valuation ${metric(identity.valuation)}, momentum ${metric(identity.momentum)}.`);
    }
    const performance = extractPricePerformance(value);
    const technicalRows = extractTechnicalRows(value);
    if (performance.length) lines.push("", "Price performance:", ...performance.map((item) => `- ${item}`));
    if (technicalRows.length) lines.push("", "Signals:", ...technicalRows.map((item) => `- ${item}`));
  } else if (lowerTitle.includes("news")) {
    const news = extractNewsRows(value);
    if (news.length) lines.push("Latest items:", ...news.map((item) => `- ${item}`));
  } else if (lowerTitle.includes("corporate")) {
    if (identity.name) lines.push(`${identity.name} (${identity.ticker})`);
    if (identity.durability || identity.valuation || identity.momentum) {
      lines.push(`DVM: durability ${metric(identity.durability)}, valuation ${metric(identity.valuation)}, momentum ${metric(identity.momentum)}.`);
    }
    const insights = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.includes("|") && !/^(stockHeaders|tableData|tableHeaders|stockData):/i.test(line))
      .filter((line) => /bonus|dividend|split|board|result|meeting|insight/i.test(line))
      .slice(0, 6);
    if (insights.length) lines.push("", "Events and insights:", ...insights.map((item) => `- ${item}`));
  } else if (lowerTitle.includes("ownership")) {
    const holdings = extractSummaryHoldings(value);
    const trends = ["Promoter", "Institutional", "FII", "MF", "DII", "Public"].map((label) => extractChartTrend(value, label)).filter(Boolean);
    if (holdings.length) lines.push("Latest holding:", ...holdings.map((item) => `- ${item}`));
    if (trends.length) lines.push("", "Trend:", ...trends.map((item) => `- ${item}`));
  } else if (lowerTitle.includes("insider") || lowerTitle.includes("bulk")) {
    const rows = extractTableRows(value);
    if (/isCurtail:\s*True/i.test(value)) lines.push("The transaction list is curtailed; review the source for the complete table.");
    if (rows.length) lines.push("Recent transactions:", ...rows.map((item) => `- ${item}`));
  } else if (lowerTitle.includes("document")) {
    const cleanDocuments = extractDocumentRows(value);
    if (cleanDocuments.length) {
      lines.push("Documents to review:", ...cleanDocuments.map((item) => `- ${item}`));
    }
  }

  const clean = lines.join("\n").trim();
  if (clean) return clean;
  if (looksLikeRawTrendlyneText(value)) {
    return "Structured table data was returned for this section. No clean summary rows were extracted; review the source table before using it in the thesis.";
  }
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.includes(" | ") && !isRawEvidenceLine(line))
    .slice(0, 18)
    .join("\n")
    .trim() || compactText(value, 900);
}

function cleanEvidenceText(title: string, value: string, max = 1200) {
  const clean = cleanTrendlyneIntel(title, value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isRawEvidenceLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return compactText(clean, max);
}

function metricEntry(
  label: string,
  value: string,
  unit: string,
  period: string,
  basis: string,
  status = value ? "available" : "missing",
  note = ""
) {
  return {
    label,
    value: value || "",
    unit,
    period: value ? period : "missing",
    basis,
    status,
    note
  };
}

function buildMetricsForPacket(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const review = dataQualityReview(company, record);
  const period = metricPeriod(record);
  const basis = sourceBasis(record);
  const derived = derivedPe(company, record);
  const netMargin = netMarginProxy(company, record);
  const entries = [
    metricEntry("Market capitalisation", m.marketCap, "INR crore", period, basis),
    metricEntry("Current price", m.currentPrice, "INR/share", period, company.financials.currentPrice ? "company record" : "missing"),
    metricEntry("Revenue", m.revenue, "INR crore", period, basis),
    metricEntry("Net profit", m.profit, "INR crore", period, basis),
    metricEntry(
      "EPS",
      review.perShareMismatch || review.shareCountMismatch ? "" : m.eps,
      "INR/share",
      period,
      basis,
      review.perShareMismatch || review.shareCountMismatch ? "withheld" : m.eps ? "available" : "missing",
      review.perShareMismatch || review.shareCountMismatch ? "Withheld because EPS/P/E/price or share-count basis failed validation." : ""
    ),
    metricEntry(
      "P/E",
      review.peInvalid && derived ? formatNumber(derived, 2) : review.peInvalid ? "" : m.pe,
      "x",
      period,
      review.peInvalid && derived ? "derived from price/EPS" : basis,
      review.peInvalid && !derived ? "withheld" : m.pe || derived ? "available" : "missing",
      review.peInvalid && derived ? "Raw P/E failed validation; derived value should be used cautiously." : ""
    ),
    metricEntry("ROE", m.roe, "%", period, basis),
    metricEntry("ROCE", m.roce, "%", period, basis),
    metricEntry("Debt/equity", m.debtEquity, "x", period, basis),
    metricEntry(
      "Operating margin",
      review.opmInvalid ? "" : m.opm,
      "%",
      period,
      basis,
      review.opmInvalid ? "withheld" : m.opm ? "available" : "missing",
      review.opmInvalid ? "Suppressed because the margin value failed validation." : ""
    ),
    metricEntry("Net margin proxy", netMargin ? formatNumber(netMargin, 2) : "", "%", period, "derived from net profit/revenue"),
    metricEntry(
      "Operating cash flow",
      review.cfoInvalid ? "" : m.cfo,
      "INR crore",
      period,
      basis,
      review.cfoInvalid ? "withheld" : m.cfo ? "available" : "missing",
      review.cfoInvalid ? "Suppressed because cash-flow value failed unit/magnitude validation." : ""
    ),
    metricEntry("Sales growth", m.salesGrowth, "%", period, basis),
    metricEntry("Profit growth", m.profitGrowth, "%", period, basis),
    metricEntry("Promoter holding", m.promoterHolding, "%", period, basis),
    metricEntry("FII holding", m.fiiHolding, "%", period, basis),
    metricEntry("DII holding", m.diiHolding, "%", period, basis),
    metricEntry("Institutional holding", m.institutionalHolding, "%", period, basis),
    metricEntry("Durability score", m.dvmDurability, "score", period, basis),
    metricEntry("Valuation score", m.dvmValuation, "score", period, basis),
    metricEntry("Momentum score", m.dvmMomentum, "score", period, basis),
    metricEntry("Analyst score", m.analystScore, "score", period, basis)
  ];

  return entries;
}

function sourceBasis(record?: FundamentalsRecord, fallback = "saved company record") {
  if (!record?.source) return fallback;
  const source = record.source.toLowerCase();
  if (source.includes("shareholding") || source.includes("exchange") || source.includes("nse")) return "exchange/company filing";
  if (source.includes("screener")) return "structured financial workbook";
  if (source.includes("trendlyne")) return "structured market-intelligence feed";
  return "saved structured source";
}

function metricRow(label: string, latest: string, period: string, basis: string, verification: string, interpretation: string) {
  return {
    metric: label,
    latest,
    period,
    basis,
    verification,
    interpretation
  };
}

function buildFinancialTablesForPacket(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const review = dataQualityReview(company, record);
  const period = metricPeriod(record);
  const basis = sourceBasis(record);
  const pe = usablePe(company, record);
  const derived = derivedPe(company, record);
  const netMargin = netMarginProxy(company, record);

  return {
    primaryFinancialTable: [
      metricRow(
        "Revenue",
        m.revenue ? `INR ${m.revenue} crore` : "Not verified",
        period,
        basis,
        m.revenue ? "Tie to latest annual/TTM/quarterly result before final report." : "Fetch latest reported revenue.",
        "Use revenue trend to judge scale and growth runway; do not infer quality without margin and cash conversion."
      ),
      metricRow(
        "Net profit",
        m.profit ? `INR ${m.profit} crore` : "Not verified",
        period,
        basis,
        m.profit ? "Check exceptional items, tax rate and base effects." : "Fetch latest reported PAT.",
        "Profit growth must be separated into recurring performance and one-off effects."
      ),
      metricRow(
        "EPS",
        review.perShareMismatch || review.shareCountMismatch || !m.eps ? "Withheld pending share-basis validation" : `INR ${m.eps}`,
        period,
        basis,
        "Reconcile EPS with price/P/E and profit/share count.",
        "EPS is suitable for valuation only after corporate actions and share basis are reconciled."
      ),
      metricRow(
        "Operating margin",
        review.opmInvalid || !m.opm ? (netMargin ? `Net margin proxy ${formatNumber(netMargin, 2)}%` : "Not verified") : `${m.opm}%`,
        period,
        review.opmInvalid && netMargin ? "derived from net profit/revenue" : basis,
        "Fetch EBITDA/operating-profit line before using operating-margin language.",
        "Margin quality determines whether growth is translating into operating leverage."
      ),
      metricRow(
        "Operating cash flow",
        review.cfoInvalid || !m.cfo ? "Withheld pending cash-flow statement" : `INR ${m.cfo} crore`,
        period,
        basis,
        "Verify from cash-flow statement and compare with PAT.",
        "Cash conversion is essential before upgrading to compounder or multibagger status."
      )
    ],
    qualityRatiosTable: [
      metricRow("ROE", m.roe ? `${m.roe}%` : "Not verified", period, basis, "Verify against average equity.", "Shows shareholder capital efficiency."),
      metricRow("ROCE", m.roce ? `${m.roce}%` : "Not verified", period, basis, "Verify EBIT/capital employed basis.", "Most important quality ratio for non-financial businesses."),
      metricRow("Debt/equity", m.debtEquity ? `${m.debtEquity}x` : "Not verified", period, basis, "Reconcile borrowings and net worth.", "Controls balance-sheet and dilution risk."),
      metricRow("Sales growth", m.salesGrowth ? `${m.salesGrowth}%` : "Not verified", period, basis, "Check period and whether growth is organic.", "Growth quality depends on sustainability and cash conversion."),
      metricRow("Profit growth", m.profitGrowth ? `${m.profitGrowth}%` : "Not verified", period, basis, "Check exceptional/base-effect context.", "Profit growth is useful only if recurring.")
    ],
    valuationInputsTable: [
      metricRow(
        "Current price",
        m.currentPrice ? `INR ${m.currentPrice}` : "Not verified",
        period,
        "market quote captured in app",
        "Cross-check against latest quote before final report.",
        "Use only as reference price, not investment conclusion."
      ),
      metricRow(
        "Market capitalisation",
        m.marketCap ? `INR ${m.marketCap} crore` : "Not verified",
        period,
        basis,
        "Reconcile market cap with price and implied share count.",
        "Market cap controls whether this is a multibagger, compounder or re-rating setup."
      ),
      metricRow(
        "P/E",
        review.peInvalid && derived ? `${formatNumber(derived, 2)}x derived` : pe ? `${formatNumber(pe, 2)}x` : "Not verified",
        period,
        review.peInvalid && derived ? "derived from price/EPS" : basis,
        "Do not use invalid or negative P/E. Reconcile with EPS and price.",
        "Valuation scenario must be built from validated or explicitly derived inputs."
      )
    ],
    withheldMetrics: [
      review.perShareMismatch || review.shareCountMismatch ? "EPS withheld from primary table until share-basis reconciliation passes." : "",
      review.peInvalid && !derived ? "P/E withheld because reported value is invalid and cannot be derived." : "",
      review.opmInvalid ? "Operating margin withheld until operating-profit/EBITDA source is verified." : "",
      review.cfoInvalid ? "Operating cash flow withheld until cash-flow statement confirms unit and magnitude." : ""
    ].filter(Boolean)
  };
}

function buildOwnershipTableForPacket(company: Company, record?: FundamentalsRecord, shareholding?: ShareholdingRecord) {
  const m = metricSet(company, record);
  const period = shareholding?.asOnDate || metricPeriod(record);
  const rows = [
    metricRow(
      "Promoter holding",
      m.promoterHolding ? `${m.promoterHolding}%` : "Not verified",
      period,
      shareholding ? "exchange/company shareholding filing" : sourceBasis(record),
      "Cross-check latest quarter, pledge and promoter group changes.",
      "High promoter holding can support alignment, but trend and pledge matter more than the absolute number."
    ),
    metricRow(
      "FII holding",
      m.fiiHolding ? `${m.fiiHolding}%` : "Not verified",
      period,
      sourceBasis(record),
      "Verify foreign institutional category taxonomy.",
      "Rising FII ownership may support liquidity but can increase expectation risk."
    ),
    metricRow(
      "DII holding",
      m.diiHolding ? `${m.diiHolding}%` : "Not verified",
      period,
      sourceBasis(record),
      "Separate mutual funds, insurance and other institutions where possible.",
      "Domestic institutional ownership helps validate interest but is not a business-quality substitute."
    ),
    metricRow(
      "Public/other implied",
      ownershipLines(company, record).find((line) => line.startsWith("Public/other implied"))?.replace("Public/other implied: ", "") || "Not verified",
      period,
      "derived from ownership categories",
      "Do not use if FII/DII/institutional categories overlap.",
      "Float matters for liquidity, volatility and institutional buying room."
    )
  ];

  return {
    ownershipTable: rows,
    exchangeFilingHistory: shareholding?.history?.slice(0, 8) || [],
    trendSummary: shareholding?.history?.length
      ? shareholding.history
          .slice(0, 4)
          .map((item) => `${item.asOnDate || "Undated"}: promoter ${item.promoterHolding || "N/V"}%, public ${item.publicHolding || "N/V"}%`)
      : [],
    verification: [
      "Verify latest shareholding quarter against company/exchange filing.",
      "Check promoter pledge separately; holding percentage alone is not enough.",
      "Confirm whether institutional categories overlap before calculating free float.",
      "Review insider/SAST activity for material buying, selling, pledge creation or release."
    ]
  };
}

function extractNewsItems(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Z0-9-]+\s*\|/.test(line) && !/^NSEcode\s*\|/i.test(line))
    .slice(0, 8)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const date = parts[15] ? parts[15].slice(0, 10) : "Undated/Unverified";
      const title = packetSafeText(parts[16] || parts[9] || parts[0]);
      const summary = packetSafeText(parts[17] || "");
      return {
        date,
        title: title || "Company update",
        summary,
        possibleInvestmentSignificance: "Classify as catalyst, risk, neutral update or routine disclosure after reading the filing/news item.",
        verification: "Open the underlying announcement or company filing before using this in the final report."
      };
    })
    .filter((item) => item.title && !looksLikeRawTrendlyneText(`${item.title} ${item.summary}`));
}

function extractCorporateEventItems(text: string) {
  const items = extractNewsItems(text);
  if (items.length) return items;
  return cleanEvidenceText("Corporate events", text, 1400)
    .split(/\r?\n/)
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => ({
      date: "Undated/Unverified",
      title: packetSafeText(line),
      summary: "",
      possibleInvestmentSignificance: "Assess whether this changes earnings, capital allocation, governance or valuation.",
      verification: "Check the latest company filing or corporate action notice."
    }))
    .filter((item) => item.title && !looksLikeRawTrendlyneText(item.title));
}

function buildEventEvidenceForPacket(intelligence?: TrendlyneIntelligenceRecord) {
  if (!intelligence) {
    return {
      newsItems: [],
      corporateEvents: [],
      catalystFormattingRules: [
        "Use only specific company events, not raw table rows.",
        "Classify each item as earnings catalyst, order/customer catalyst, corporate action, governance event, risk event or neutral disclosure.",
        "Tie every catalyst to timing, investment significance and what would confirm or disprove it."
      ]
    };
  }

  return {
    newsItems: extractNewsItems(intelligence.news),
    corporateEvents: extractCorporateEventItems(intelligence.events),
    documentsToReview: extractDocumentRows(intelligence.documents),
    catalystFormattingRules: [
      "Summarize events in plain investment language.",
      "Do not quote raw table headers, URLs, provider names or connector fields.",
      "Use catalysts only when they can change revenue, margin, ROCE, cash flow, governance, valuation or market perception."
    ]
  };
}

function buildPriceMarketCapSanity(company: Company, record?: FundamentalsRecord) {
  const m = metricSet(company, record);
  const price = asNumber(m.currentPrice);
  const marketCap = asNumber(m.marketCap);
  const profit = asNumber(m.profit);
  const eps = asNumber(m.eps);
  const pe = asNumber(m.pe);
  const impliedSharesFromMarket = price && marketCap ? marketCap / price : 0;
  const impliedSharesFromEarnings = profit && eps ? profit / eps : 0;
  const impliedEpsFromPe = price && pe ? price / pe : 0;
  const perShareMismatch = hasPerShareMismatch(company, record);
  const shareCountMismatch = hasShareCountMismatch(company, record);

  return {
    currentPriceInr: m.currentPrice || "",
    marketCapInrCr: m.marketCap || "",
    reportedEpsInr: m.eps || "",
    reportedPe: m.pe || "",
    impliedSharesFromMarketCapCr: impliedSharesFromMarket ? formatNumber(impliedSharesFromMarket, 2) : "",
    impliedSharesFromProfitAndEpsCr: impliedSharesFromEarnings ? formatNumber(impliedSharesFromEarnings, 2) : "",
    impliedEpsFromPriceAndPe: impliedEpsFromPe ? formatNumber(impliedEpsFromPe, 2) : "",
    status: perShareMismatch || shareCountMismatch ? "requires reconciliation before valuation" : "passes first-level arithmetic check",
    actionRequired:
      perShareMismatch || shareCountMismatch
        ? "Check corporate actions, split/bonus adjustments, consolidated vs standalone profit, trailing vs quarterly EPS and stale quote timing."
        : "Still verify latest price and market cap before final publication."
  };
}

function buildFilingVerificationChecklist(company: Company, record?: FundamentalsRecord, shareholding?: ShareholdingRecord, intelligence?: TrendlyneIntelligenceRecord) {
  const review = dataQualityReview(company, record, intelligence);
  return [
    {
      priority: "P0",
      check: "Latest annual report and latest quarterly result",
      status: record?.reportDate ? "partially available" : "missing",
      why: "Revenue, PAT, EPS, margins, ROE/ROCE and debt must be tied to a named period before final numbers are used."
    },
    {
      priority: "P0",
      check: "Price, EPS, P/E and market-cap reconciliation",
      status: review.perShareMismatch || review.shareCountMismatch || review.peInvalid ? "failed or incomplete" : "passes first-level check",
      why: "Prevents impossible valuation scenarios and misleading implied prices."
    },
    {
      priority: "P0",
      check: "Cash-flow statement",
      status: review.cfoInvalid || !metricSet(company, record).cfo ? "needs verification" : "available but verify period",
      why: "Confirms whether reported profit converts to operating cash."
    },
    {
      priority: "P0",
      check: "Latest shareholding pattern and pledge status",
      status: shareholding || metricSet(company, record).promoterHolding ? "partially available" : "missing",
      why: "Promoter alignment, pledge risk and institutional ownership must be verified from latest filing."
    },
    {
      priority: "P1",
      check: "Exceptional items, one-off gains/losses and base effects",
      status: hasExceptionalContext(intelligence) ? "possible context found" : "not found in saved evidence",
      why: "Large profit changes should not be misclassified as structural without adjustment."
    },
    {
      priority: "P1",
      check: "Segment and end-market evidence",
      status: review.conglomerateNeedsSegments ? "required before final verdict" : "required for richer report",
      why: "Business quality depends on which segment is creating growth and margin."
    },
    {
      priority: "P1",
      check: "Recent announcements, orders, corporate actions and governance events",
      status: intelligence ? "available for review" : "missing",
      why: "Converts news into catalysts, risks or neutral items."
    }
  ];
}

function buildCodexVerificationChecklist(
  company: Company,
  record?: FundamentalsRecord,
  shareholding?: ShareholdingRecord,
  intelligence?: TrendlyneIntelligenceRecord
) {
  const review = dataQualityReview(company, record, intelligence);
  return {
    beforeWritingVerdict: [
      "Confirm what the company actually does, including products, customers, end-markets and segment economics.",
      "Use only period-labelled numbers in the main financial table.",
      "Run price/market-cap/EPS/P/E reconciliation before valuation.",
      "Check whether profit growth or decline is affected by exceptional items, one-off charges, tax effects or base effects.",
      "If evidence is incomplete, still write the business analysis but reduce confidence and specify real-world diligence required."
    ],
    p0MustVerify: [
      ...review.p0,
      "Latest reported revenue, PAT, EPS and margin period.",
      "Current market price and market capitalisation.",
      "Cash-flow statement and working-capital movement.",
      "Latest shareholding pattern, pledge and promoter-group changes."
    ],
    p1ShouldVerify: [
      ...review.p1,
      "Segment-level revenue and margin drivers.",
      "Recent announcements that could change earnings or governance.",
      "Peer valuation and reverse-DCF assumptions.",
      "Management commentary, concall transcript and auditor notes."
    ],
    finalReportGuardrails: [
      "Final report must be stock-only and must not mention data providers, connector names, raw payloads or app internals.",
      "Do not leave sections blank; if hard evidence is weak, write a lower-confidence but complete investment view.",
      "Do not create bull-case implied prices from unchecked EPS or multiple assumptions.",
      "Do not call a stock a trap without explaining whether the trap is valuation, governance, accounting, debt, execution or cyclicality."
    ],
    filingVerificationChecklist: buildFilingVerificationChecklist(company, record, shareholding, intelligence)
  };
}

function buildEvidenceQualityBoard(
  company: Company,
  record?: FundamentalsRecord,
  shareholding?: ShareholdingRecord,
  intelligence?: TrendlyneIntelligenceRecord
) {
  const review = dataQualityReview(company, record, intelligence);
  const m = metricSet(company, record);
  const period = metricPeriod(record);
  const sourceRows = sourceCoverageRows(company, record, intelligence).map(([source, status]) => ({ source, status }));
  const hasCoreFinancials = Boolean(m.revenue && m.profit && (m.eps || m.pe));
  const hasReturnRatios = Boolean(m.roe || m.roce);
  const hasOwnership = Boolean(shareholding || m.promoterHolding || m.fiiHolding || m.diiHolding);
  const hasEvents = Boolean(intelligence && (extractNewsItems(intelligence.news).length || extractCorporateEventItems(intelligence.events).length));

  return {
    status: review.p0.length ? "blocked-until-reconciled" : hasCoreFinancials ? "usable-with-verification" : "incomplete",
    period,
    coverage: {
      coreFinancials: hasCoreFinancials ? "available" : "missing-or-thin",
      returnRatios: hasReturnRatios ? "available" : "missing-or-thin",
      ownership: hasOwnership ? "available" : "missing-or-thin",
      recentEvents: hasEvents ? "available" : "missing-or-thin",
      segmentEvidence: review.conglomerateNeedsSegments ? "mandatory" : "verify"
    },
    sourceRows,
    mustNotUseBlindly: [
      "Any metric without a period, unit or confidence level.",
      "Any EPS/P/E valuation output that fails price, EPS and market-cap reconciliation.",
      "Any operating cash-flow figure that is too small for company scale or lacks cash-flow-statement basis.",
      "Any ownership category where institutional buckets may overlap."
    ],
    reportImplication:
      review.p0.length
        ? "Write analysis, but withhold final valuation confidence until P0 checks are reconciled."
        : "Use the evidence pack to write a full stock-only report, while explicitly reflecting weaker evidence as lower conviction."
  };
}

function buildOwnershipForPacket(company: Company, record?: FundamentalsRecord, shareholding?: ShareholdingRecord, intelligence?: TrendlyneIntelligenceRecord) {
  const ownershipTable = buildOwnershipTableForPacket(company, record, shareholding);
  return {
    latest: ownershipLines(company, record),
    ownershipTable: ownershipTable.ownershipTable,
    exchangeFiling: shareholding
      ? {
          asOnDate: shareholding.asOnDate || "Undated/Unverified",
          submissionDate: shareholding.submissionDate || "Undated/Unverified",
          promoterHolding: shareholding.promoterHolding,
          publicHolding: shareholding.publicHolding,
          employeeTrusts: shareholding.employeeTrusts,
          history: shareholding.history.slice(0, 8)
        }
      : null,
    exchangeFilingHistory: ownershipTable.exchangeFilingHistory,
    trendSummary: ownershipTable.trendSummary,
    trend: intelligence ? cleanEvidenceText("Ownership", intelligence.shareholding, 1200) : "",
    insiderSast: intelligence ? cleanEvidenceText("Insider / SAST", intelligence.sast, 1000) : "",
    bulkBlockDeals: intelligence ? cleanEvidenceText("Bulk and block deals", intelligence.bulkBlock, 1000) : "",
    verification: ownershipTable.verification
  };
}

function buildIntelligenceDigest(intelligence?: TrendlyneIntelligenceRecord) {
  const eventEvidence = buildEventEvidenceForPacket(intelligence);
  if (!intelligence) {
    return {
      overview: "",
      technicals: "",
      news: [],
      corporateEvents: [],
      documents: [],
      ownership: "",
      insiderSast: "",
      bulkBlockDeals: ""
    };
  }

  return {
    overview: cleanEvidenceText("Overview and DVM", intelligence.overview, 1400),
    technicals: cleanEvidenceText("Technicals", intelligence.technical, 1000),
    news: eventEvidence.newsItems,
    corporateEvents: eventEvidence.corporateEvents,
    documents: eventEvidence.documentsToReview || extractDocumentRows(intelligence.documents),
    ownership: cleanEvidenceText("Ownership", intelligence.shareholding, 1200),
    insiderSast: cleanEvidenceText("Insider / SAST", intelligence.sast, 1000),
    bulkBlockDeals: cleanEvidenceText("Bulk and block deals", intelligence.bulkBlock, 1000)
  };
}

function buildSavedNotesForPacket(company: Company, record?: FundamentalsRecord) {
  return {
    businessSummary: savedResearchText(company.businessSummary, businessModelDraft(company, record)),
    industryOpportunity: savedResearchText(
      company.industryOpportunity,
      `Industry exposure: ${inferredSector(company, record)}. Verify market size, end-market demand, competition, capacity and margin runway.`
    ),
    multibaggerCase: savedResearchText(company.multibaggerCase, "Build a 5x/10x case only from verified growth, ROCE, moat, reinvestment and valuation evidence."),
    managementAssessment: savedResearchText(company.managementAssessment, "Assess promoter quality, capital allocation, governance, auditor history and execution."),
    bullThesis: savedResearchText(company.bullThesis, "Build the upside case from verified growth, margin, cash-flow, moat and valuation evidence."),
    bearThesis: savedResearchText(company.bearThesis, "Build the downside case from valuation, execution, governance, cash conversion and cyclicality risk."),
    keyAssumptions: savedResearchText(company.keyAssumptions, "List only assumptions required to justify upside and current valuation."),
    thesisKillers: savedResearchText(company.thesisKillers, "List evidence that would invalidate the investment thesis.")
  };
}

function packetSafeLabel(value: string) {
  return value
    .replace(/^Trendlyne\s+/i, "")
    .replace(/\bTrendlyne\b/gi, "Market intelligence")
    .replace(/\bNSE\b/gi, "Exchange")
    .replace(/\bMCP\b/gi, "data")
    .replace(/\bAPI\b/gi, "data feed")
    .replace(/\bpayload\b/gi, "source text")
    .replace(/\s+/g, " ")
    .trim();
}

function packetSafeText(value: string) {
  return scrubReportText(value)
    .replace(/\bTrendlyne\b/gi, "market intelligence")
    .replace(/\bNSE\b/gi, "exchange")
    .replace(/\bMCP\b/gi, "data")
    .replace(/\bAPI\b/gi, "data feed")
    .replace(/\bpayload\b/gi, "source text")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildReportBriefForPacket(company: Company, record?: FundamentalsRecord, intelligence?: TrendlyneIntelligenceRecord) {
  const review = dataQualityReview(company, record, intelligence);
  const framework = isMegaCapCompany(company, record) ? "Large-cap compounder/re-rating lens" : "Multibagger and trap-risk lens";

  return {
    framework,
    dataQualityGate: review.p0.length ? "failed" : "passed first-level checks",
    analystFocus: [
      "Explain the actual business model, revenue drivers, customers/end-markets, segment economics and competitive position.",
      "Translate financials into business quality: growth durability, margin quality, return on capital, balance sheet and cash conversion.",
      "Assess management quality through ownership, governance, capital allocation, auditor/related-party risk and execution evidence.",
      "Evaluate valuation with scenario logic; do not allow invalid or mechanically extreme implied prices.",
      "Separate genuine multibagger potential from popular-stock, high-valuation or deteriorating-fundamental traps."
    ],
    stockOnlyOutputRules: [
      "The final report must discuss only the stock and investment analysis.",
      "Do not mention app internals, raw payloads, data-provider reconciliation, tool names, connector errors or extraction mistakes.",
      "If evidence is insufficient, state the investment implication and the exact real-world information still needed, without narrating the data pipeline.",
      "Use time-stamped metrics only. If a number has no reliable period or unit, keep it out of the main table and discuss it as unverified."
    ],
    requiredFinalReportSections: [
      "Executive verdict",
      "Business model and segment economics",
      "Industry runway and competitive position",
      "Financial quality and unit sanity",
      "Ownership, governance and management",
      "Valuation and scenario analysis",
      "Catalysts and monitoring triggers",
      "Risks and potential trap indicators",
      "Multibagger probability",
      "What must happen for 5x/10x",
      "What would make the thesis fail",
      "Final recommendation and next diligence"
    ]
  };
}

function provenanceSource(record?: FundamentalsRecord): MetricSource {
  const source = (record?.source || "").toLowerCase();
  if (source.includes("trendlyne")) return "trendlyne";
  if (source.includes("nse")) return "nse";
  if (source.includes("bse")) return "bse";
  if (source.includes("kite")) return "kite";
  return record ? "manual" : "app";
}

function buildProvenanceInput(company: Company, record?: FundamentalsRecord, shareholding?: ShareholdingRecord) {
  return {
    ...company.financials,
    ...(record || {}),
    marketCap: record?.marketCap || company.marketCap,
    promoterHolding: shareholding?.promoterHolding || record?.promoterHolding || company.financials.promoterHolding,
    fiiHolding: record?.fiiHolding || company.financials.fiiHolding,
    diiHolding: record?.diiHolding || company.financials.diiHolding,
    institutionalHolding: record?.institutionalHolding || company.financials.institutionalHolding,
    reportDate: record?.reportDate || shareholding?.asOnDate || "",
    importedAt: record?.importedAt || shareholding?.importedAt || new Date().toISOString()
  };
}

function buildCleanCodexResearchPacket(
  company: Company,
  fundamentalsRecord?: FundamentalsRecord,
  shareholdingRecord?: ShareholdingRecord,
  trendlyneIntel?: TrendlyneIntelligenceRecord
) {
  const generatedAt = new Date().toISOString();
  const review = dataQualityReview(company, fundamentalsRecord, trendlyneIntel);
  const cleanIntelligence = buildIntelligenceDigest(trendlyneIntel);
  const eventEvidence = buildEventEvidenceForPacket(trendlyneIntel);
  const provenanceInput = buildProvenanceInput(company, fundamentalsRecord, shareholdingRecord);
  const criticalMetrics = buildCriticalMetrics(provenanceInput, provenanceSource(fundamentalsRecord), provenanceInput.importedAt);

  return {
    packetType: "IMRS_CODEX_RESEARCH_PACKET",
    version: "2.4",
    generatedAt,
    purpose:
      "Provide a clean, analyst-ready evidence packet for Codex to create an institutional-grade, stock-only research report.",
    codexTask:
      "Use dynamic investment judgment, not fixed app scoring, to write the final report. Reconcile metrics, interpret the business case and produce a complete stock research view.",
    reportBrief: buildReportBriefForPacket(company, fundamentalsRecord, trendlyneIntel),
    companyProfile: {
      name: company.name,
      ticker: company.ticker,
      exchange: company.exchange || "Unknown",
      bseCode: company.bseCode || "",
      isin: company.isin || "",
      listedSeries: company.listedSeries || "",
      preferredLookupSymbols: Array.from(
        new Set([company.ticker, externalLookupTicker(company.ticker), company.bseCode].filter(Boolean))
      ),
      sector: company.sector,
      marketCapInrCr: company.marketCap,
      status: company.status,
      inferredSector: inferredSector(company, fundamentalsRecord)
    },
    codexWorkflow: {
      handoffMode: "local-bridge-and-monitor",
      expectedInboxFile: "tmp/codex-inbox/latest-packet.json",
      expectedPromptFile: "tmp/codex-inbox/latest-prompt.txt",
      finalReportTarget: `public/reports/${safeFileName(externalLookupTicker(company.ticker) || company.ticker || company.name)}.json`,
      publishInstruction:
        "Generate a complete final stock-only institutional research report. For report-only publishing, run strict report QC and PDF rendering, commit the JSON report and push to GitHub. Run full app lint/build only when application code changed."
    },
    evidenceSummary: {
      sourceCoverage: sourceCoverageRows(company, fundamentalsRecord, trendlyneIntel).map(([source, status]) => ({ source, status })),
      sanityCheck: sanityCheckItems(company, fundamentalsRecord, trendlyneIntel),
      needsVerification: needsVerificationItems(company, fundamentalsRecord, trendlyneIntel),
      dataQuality: {
        p0: review.p0,
        p1: review.p1,
        notes: review.notes,
        flags: {
          perShareMismatch: review.perShareMismatch,
          shareCountMismatch: review.shareCountMismatch,
          cfoInvalid: review.cfoInvalid,
          opmInvalid: review.opmInvalid,
          peInvalid: review.peInvalid,
          staleFinancials: review.staleFinancials,
          conglomerateNeedsSegments: review.conglomerateNeedsSegments
        }
      }
    },
    reportReadiness: {
      hasStructuredFundamentals: Boolean(fundamentalsRecord),
      hasOwnershipEvidence: Boolean(shareholdingRecord || company.financials.promoterHolding || company.financials.fiiHolding || company.financials.diiHolding),
      hasMarketIntelligence: Boolean(trendlyneIntel),
      hasSavedResearchNotes: Object.values(buildSavedNotesForPacket(company, fundamentalsRecord)).some((value) => Boolean(value)),
      expectedCodexAction:
        "Use available evidence to form a complete investment judgement. Do not leave reader-facing sections blank merely because one source is incomplete."
    },
    verificationPlan: {
      codexMustVerify: buildCodexVerificationChecklist(company, fundamentalsRecord, shareholdingRecord, trendlyneIntel),
      priceMarketCapSanity: buildPriceMarketCapSanity(company, fundamentalsRecord),
      filingVerification: buildFilingVerificationChecklist(company, fundamentalsRecord, shareholdingRecord, trendlyneIntel)
    },
    evidenceQualityBoard: buildEvidenceQualityBoard(company, fundamentalsRecord, shareholdingRecord, trendlyneIntel),
    criticalMetrics,
    criticalMetricSummary: summarizeCriticalMetrics(criticalMetrics),
    segmentAnalysis: buildSegmentAnalysisPacket({
      companyName: company.name,
      sector: inferredSector(company, fundamentalsRecord),
      businessSummary: company.businessSummary,
      industryOpportunity: company.industryOpportunity
    }),
    scoringRationale: buildScoringRationalePacket(company.scores, provenanceInput),
    reportQualityRules: {
      requireCriticalMetricProvenance: true,
      requireSegmentAnalysis: true,
      requireScoringRationale: true,
      suppressUnprovenMetricsFromPrimaryTables: true,
      requireUsableMetricSummary: true,
      requireScoreExplanation: true,
      stockOnlyReaderFacingOutput: true
    },
    financialMetrics: buildMetricsForPacket(company, fundamentalsRecord),
    financialTables: buildFinancialTablesForPacket(company, fundamentalsRecord),
    ownership: buildOwnershipForPacket(company, fundamentalsRecord, shareholdingRecord, trendlyneIntel),
    marketAndEventEvidence: {
      dvmAndOverview: cleanIntelligence.overview,
      technicals: cleanIntelligence.technicals,
      news: cleanIntelligence.news,
      corporateEvents: cleanIntelligence.corporateEvents,
      documentsToReview: cleanIntelligence.documents,
      catalystFormattingRules: eventEvidence.catalystFormattingRules
    },
    savedResearchNotes: buildSavedNotesForPacket(company, fundamentalsRecord),
    riskRegister: meaningfulRisks(company).map((risk) => ({
      risk: packetSafeLabel(risk.title),
      probability: risk.probability,
      impact: risk.impact,
      mitigationOrTrigger: packetSafeText(risk.mitigation) || packetSafeLabel(risk.mitigation)
    })),
    catalystTracker: meaningfulCatalysts(company).map((catalyst) => ({
      catalyst: packetSafeLabel(catalyst.title),
      expectedDate: catalyst.date || "",
      status: catalyst.status,
      evidenceOrMilestone: packetSafeText(catalyst.notes) || packetSafeLabel(catalyst.notes)
    })),
    documents: company.documents.map((document) => ({
      name: packetSafeLabel(document.name),
      type: packetSafeLabel(document.type),
      status: packetSafeLabel(document.status)
    })),
    quarterlyReviews: company.reviews.map((review) => ({
      quarter: packetSafeLabel(review.quarter),
      verdict: packetSafeLabel(review.verdict),
      notes: packetSafeText(review.notes)
    }))
  };
}

function mergeDocuments(existing: Company["documents"], additions: Company["documents"]) {
  const names = new Set(existing.map((item) => normalizeKey(item.name)));
  return [
    ...existing,
    ...additions.filter((item) => {
      const key = normalizeKey(item.name);
      if (names.has(key)) return false;
      names.add(key);
      return true;
    })
  ];
}

function mergeRisks(existing: Company["risks"], additions: Company["risks"]) {
  const cleanedExisting = existing.filter((item) => !shouldReplaceGeneratedItem(`${item.title} ${item.mitigation}`));
  const names = new Set(cleanedExisting.map((item) => normalizeKey(item.title)));
  return [
    ...cleanedExisting,
    ...additions.filter((item) => {
      const key = normalizeKey(item.title);
      if (names.has(key)) return false;
      names.add(key);
      return true;
    })
  ];
}

function mergeCatalysts(existing: Company["catalysts"], additions: Company["catalysts"]) {
  const cleanedExisting = existing.filter((item) => !shouldReplaceGeneratedItem(`${item.title} ${item.notes}`));
  const names = new Set(cleanedExisting.map((item) => normalizeKey(item.title)));
  return [
    ...cleanedExisting,
    ...additions.filter((item) => {
      const key = normalizeKey(item.title);
      if (names.has(key)) return false;
      names.add(key);
      return true;
    })
  ];
}

function mergeReviews(existing: Company["reviews"], additions: Company["reviews"]) {
  const names = new Set(existing.map((item) => normalizeKey(`${item.quarter}${item.notes}`)));
  return [
    ...existing,
    ...additions.filter((item) => {
      const key = normalizeKey(`${item.quarter}${item.notes}`);
      if (names.has(key)) return false;
      names.add(key);
      return true;
    })
  ];
}

function enrichWithTrendlyne(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const review = dataQualityReview(company, record, intelligence);
  const dvmDurability = scoreFromDvm(record.dvmDurability, company.scores.businessQuality);
  const dvmValuation = scoreFromDvm(record.dvmValuation, company.scores.valuation);
  const dvmMomentum = scoreFromDvm(record.dvmMomentum, company.scores.industryTailwinds);
  const roce = asNumber(record.roce);
  const roe = asNumber(record.roe);
  const debt = Number(record.debtEquity);
  const financialStrength = clampScore(
    [
      ratioScore(record.roce, 20, 12),
      ratioScore(record.roe, 18, 12),
      Number.isFinite(debt) ? ratioScore(record.debtEquity, 0.5, 1, false) : company.scores.financialStrength
    ].reduce((sum, item) => sum + item, 0) / 3
  );
  const growthRunway = clampScore((ratioScore(record.salesGrowth, 20, 10) + dvmMomentum) / 2);
  const managementQuality = clampScore(
    [
      Number(record.promoterHolding) >= 45 ? 7 : Number(record.promoterHolding) > 0 ? 5 : company.scores.managementQuality,
      /pledge|disposal|sell|sast|insider/i.test(intelligence.sast) ? 5 : 7
    ].reduce((sum, item) => sum + item, 0) / 2
  );
  const governanceScore = /pledge|disposal|sell|sast|insider/i.test(intelligence.sast)
    ? Math.min(company.scores.governance, 5)
    : Math.max(company.scores.governance, managementQuality);
  const cashFlowQuality = review.cfoInvalid
    ? Math.min(company.scores.cashFlowQuality, 5)
    : record.cfo
      ? clampScore((financialStrength + ratioScore(record.cfo, 1, 0)) / 2 + 1)
      : company.scores.cashFlowQuality;
  const trendlyneDocuments: Company["documents"] = [
    { name: "Market overview and quality scores", type: "Other", status: "Key Source" },
    { name: "Ownership and insider activity", type: "Exchange Filing", status: "Key Source" },
    { name: "Company document search", type: "Other", status: "To Review" }
  ];
  const cleanNews = cleanTrendlyneIntel("News and announcements", intelligence.news);
  const cleanEvents = cleanTrendlyneIntel("Corporate events", intelligence.events);
  const cleanTechnical = cleanTrendlyneIntel("Technicals", intelligence.technical);
  const cleanSast = cleanTrendlyneIntel("Insider / SAST", intelligence.sast);
  const trendlyneCatalysts: Company["catalysts"] = [];
  if (hasMeaningfulText(cleanNews)) {
    trendlyneCatalysts.push({
      title: "News and announcements review",
      date: "",
      status: "In Progress",
      notes: compactText(cleanNews, 260)
    });
  }
  if (hasMeaningfulText(cleanEvents)) {
    trendlyneCatalysts.push({
      title: "Corporate events review",
      date: "",
      status: "Expected",
      notes: compactText(cleanEvents, 260)
    });
  }
  const trendlyneRisks: Company["risks"] = [];
  if (/below|negative|weak|volatility/i.test(intelligence.technical)) {
    trendlyneRisks.push({
      title: "Technical weakness",
      probability: "Medium",
      impact: "Medium",
      mitigation: compactText(cleanTechnical, 220)
    });
  }
  if (/pledge|disposal|sell|sast|insider/i.test(intelligence.sast)) {
    trendlyneRisks.push({
      title: "Insider/SAST watch",
      probability: "Medium",
      impact: "High",
      mitigation: compactText(cleanSast, 220)
    });
  }
  if (Number(record.profitGrowth) < 0) {
    trendlyneRisks.push({
      title: "Negative profit growth",
      probability: "High",
      impact: "High",
      mitigation: `Profit growth is ${record.profitGrowth}%. Verify whether this is cyclical, one-off or structural.`
    });
  }
  if ((roce > 0 && roce < 12) || (roe > 0 && roe < 12)) {
    trendlyneRisks.push({
      title: "Weak capital efficiency",
      probability: "Medium",
      impact: "High",
      mitigation: `ROE/ROCE are ${record.roe || "-"}/${record.roce || "-"}%. Require evidence of improvement before assigning multibagger status.`
    });
  }
  if (usablePe(company, record) > 35 || (Number(record.dvmValuation) > 0 && Number(record.dvmValuation) < 45)) {
    trendlyneRisks.push({
      title: "Valuation risk",
      probability: "Medium",
      impact: "High",
      mitigation: `P/E is ${usablePe(company, record) ? formatNumber(usablePe(company, record), 2) : "-"} and DVM valuation is ${
        record.dvmValuation || "-"
      }. Test reverse DCF and peer valuation.`
    });
  }
  if (Number(record.salesGrowth) >= 15 || Number(record.profitGrowth) >= 15) {
    trendlyneCatalysts.push({
      title: "Growth delivery watch",
      date: "",
      status: "Expected",
      notes: `Track whether sales/profit growth of ${record.salesGrowth || "-"}/${record.profitGrowth || "-"}% continues in upcoming results.`
    });
  }
  if (Number(record.dvmMomentum) > 0 && Number(record.dvmMomentum) < 45) {
    trendlyneCatalysts.push({
      title: "Momentum recovery trigger",
      date: "",
      status: "Expected",
      notes: `DVM momentum is ${record.dvmMomentum}. Watch for price strength and improving result commentary before upgrading.`
    });
  }
  const qualityPenalty = review.p0.length ? Math.min(3, review.p0.length) : 0;
  const aiOutputCompany = {
    ...company,
    businessSummary: setIfDraft(company.businessSummary, buildBusinessSummary(company, record, intelligence)),
    multibaggerCase: setIfDraft(company.multibaggerCase, buildMultibaggerCase(company, record, intelligence)),
    industryOpportunity: setIfDraft(company.industryOpportunity, buildIndustryOpportunity(company, record, intelligence)),
    managementAssessment: setIfDraft(company.managementAssessment, buildManagementAssessment(record, intelligence)),
    bullThesis: setIfDraft(company.bullThesis, buildBullThesis(company, record, intelligence)),
    bearThesis: setIfDraft(company.bearThesis, buildBearThesis(company, record, intelligence)),
    keyAssumptions: setIfDraft(company.keyAssumptions, buildKeyAssumptions(company, record)),
    thesisKillers: setIfDraft(company.thesisKillers, buildThesisKillers(record, intelligence))
  };

  return {
    ...aiOutputCompany,
    status: company.status === "Watchlist" ? "Researching" : company.status,
    dataSource: `${company.dataSource || "Company search"} + Market data sync (${new Date(intelligence.importedAt).toISOString().slice(0, 10)})`,
    aiPrompt: setIfDraft(company.aiPrompt, buildAnalystPrompt(company)),
    aiOutput: company.aiOutput,
    documents: mergeDocuments(company.documents, trendlyneDocuments),
    catalysts: mergeCatalysts(company.catalysts, trendlyneCatalysts),
    risks: mergeRisks(company.risks, trendlyneRisks),
    reviews: mergeReviews(company.reviews, [buildResearchReview(record, intelligence)]),
    scores: {
      ...company.scores,
      businessQuality: dvmDurability,
      managementQuality,
      financialStrength: clampScore(financialStrength - qualityPenalty),
      growthRunway,
      moat: clampScore((dvmDurability + company.scores.moat) / 2),
      valuation: dvmValuation,
      industryTailwinds: dvmMomentum,
      cashFlowQuality,
      governance: governanceScore,
      riskReward: clampScore((dvmValuation + dvmDurability + financialStrength + growthRunway) / 4 - qualityPenalty)
    }
  };
}

function asNumber(value: string) {
  return Number(value) || 0;
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\blimited\b|\bltd\b|\bindia\b|[^a-z0-9]/g, "")
    .trim();
}

function externalLookupTicker(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/-(BE|EQ)$/i, "");
}

function generatedReportUrls(ticker: string) {
  const lookupSymbol = externalLookupTicker(ticker);
  return Array.from(new Set([
    lookupSymbol,
    ticker.toUpperCase(),
    safeFileName(lookupSymbol),
    safeFileName(ticker.toUpperCase())
  ]))
    .filter(Boolean)
    .map((symbol) => `/reports/${encodeURIComponent(symbol)}.json`);
}

function tickersMatch(left: string, right: string) {
  return externalLookupTicker(left) === externalLookupTicker(right);
}

function bseLookupCode(company: Pick<Company, "ticker" | "bseCode">) {
  const code = (company.bseCode || "").trim();
  if (code) return code;
  return /^\d+$/.test(company.ticker.trim()) ? company.ticker.trim() : "";
}

function companiesMatch(left: Pick<Company, "ticker" | "exchange" | "bseCode">, right: CompanySearchResult) {
  if (left.bseCode && right.bseCode && left.bseCode === right.bseCode) return true;
  if (!tickersMatch(left.ticker, right.ticker)) return false;
  return !left.exchange || !right.exchange || left.exchange === right.exchange;
}

function formatNumber(value: number | string | null | undefined, decimals = 2) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return "";
  const fixed = numberValue.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "");
}

function safeFileName(value: string) {
  return (value || "IMRS")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function excelDate(value: number | string | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const date = new Date(Math.round((value - 25569) * 86400 * 1000));
  return date.toISOString().slice(0, 10);
}

function parseXml(text: string) {
  return new DOMParser().parseFromString(text, "application/xml");
}

function parseSharedStrings(xml: string) {
  const doc = parseXml(xml);
  return Array.from(doc.getElementsByTagName("si")).map((item) =>
    Array.from(item.getElementsByTagName("t"))
      .map((node) => node.textContent || "")
      .join("")
  );
}

function parseSheet(xml: string, sharedStrings: string[]) {
  const doc = parseXml(xml);
  const cells = new Map<string, string | number>();

  Array.from(doc.getElementsByTagName("c")).forEach((cell) => {
    const ref = cell.getAttribute("r");
    if (!ref) return;
    const type = cell.getAttribute("t");
    const valueNode = cell.getElementsByTagName("v")[0];
    const inlineNode = cell.getElementsByTagName("t")[0];
    const raw = valueNode?.textContent || inlineNode?.textContent || "";

    if (type === "s") {
      cells.set(ref, sharedStrings[Number(raw)] || "");
    } else if (type === "inlineStr" || type === "str") {
      cells.set(ref, raw);
    } else if (raw !== "") {
      const numeric = Number(raw);
      cells.set(ref, Number.isFinite(numeric) ? numeric : raw);
    }
  });

  return cells;
}

function getCell(cells: Map<string, string | number>, row: number, col: number) {
  let name = "";
  let n = col;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return cells.get(`${name}${row}`);
}

function findDataSheetPath(files: Record<string, Uint8Array>) {
  const workbook = parseXml(strFromU8(files["xl/workbook.xml"]));
  const rels = parseXml(strFromU8(files["xl/_rels/workbook.xml.rels"]));
  const sheets = Array.from(workbook.getElementsByTagName("sheet"));
  const dataSheet = sheets.find((sheet) => sheet.getAttribute("name") === "Data Sheet");
  const relId = dataSheet?.getAttribute("r:id");
  if (!relId) throw new Error("Screener Data Sheet not found.");

  const rel = Array.from(rels.getElementsByTagName("Relationship")).find((item) => item.getAttribute("Id") === relId);
  const target = rel?.getAttribute("Target");
  if (!target) throw new Error("Screener Data Sheet target not found.");

  return `xl/${target.replace(/^\/?xl\//, "")}`;
}

function findSheetPath(files: Record<string, Uint8Array>, preferredName?: string) {
  const workbook = parseXml(strFromU8(files["xl/workbook.xml"]));
  const rels = parseXml(strFromU8(files["xl/_rels/workbook.xml.rels"]));
  const sheets = Array.from(workbook.getElementsByTagName("sheet"));
  const chosen =
    sheets.find((sheet) => preferredName && normalizeKey(sheet.getAttribute("name") || "") === normalizeKey(preferredName)) ||
    sheets[0];
  const relId = chosen?.getAttribute("r:id");
  if (!relId) throw new Error("Workbook sheet not found.");

  const rel = Array.from(rels.getElementsByTagName("Relationship")).find((item) => item.getAttribute("Id") === relId);
  const target = rel?.getAttribute("Target");
  if (!target) throw new Error("Workbook sheet target not found.");

  return `xl/${target.replace(/^\/?xl\//, "")}`;
}

function columnNameToNumber(name: string) {
  return name.split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

function cellsToRows(cells: Map<string, string | number>) {
  const rows: string[][] = [];
  cells.forEach((value, ref) => {
    const match = /^([A-Z]+)(\d+)$/i.exec(ref);
    if (!match) return;
    const col = columnNameToNumber(match[1].toUpperCase()) - 1;
    const row = Number(match[2]) - 1;
    rows[row] ||= [];
    rows[row][col] = String(value ?? "").trim();
  });
  return rows.filter((row) => row.some(Boolean));
}

function extractWorkbookRows(buffer: ArrayBuffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const sharedStrings = files["xl/sharedStrings.xml"] ? parseSharedStrings(strFromU8(files["xl/sharedStrings.xml"])) : [];
  const sheetPath = findSheetPath(files, "Data");
  return cellsToRows(parseSheet(strFromU8(files[sheetPath]), sharedStrings));
}

function cleanImportedValue(value: string | undefined) {
  if (!value) return "";
  const trimmed = value.replace(/[,₹%]/g, "").trim();
  if (!trimmed || trimmed === "-" || /^na$/i.test(trimmed)) return "";
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? formatNumber(numeric) : value.trim();
}

const trendlyneAliases: Record<keyof Pick<
  FundamentalsRecord,
  | "companyName"
  | "ticker"
  | "marketCap"
  | "revenue"
  | "profit"
  | "eps"
  | "pe"
  | "roe"
  | "roce"
  | "debtEquity"
  | "salesGrowth"
  | "profitGrowth"
  | "opm"
  | "cfo"
  | "currentPrice"
  | "fiiHolding"
  | "diiHolding"
  | "institutionalHolding"
  | "dvmDurability"
  | "dvmValuation"
  | "dvmMomentum"
  | "analystScore"
>, string[]> = {
  companyName: ["company", "company name", "stock name", "name"],
  ticker: ["ticker", "symbol", "nse code", "nse symbol"],
  marketCap: ["market cap", "market capitalization", "mcap"],
  revenue: ["sales", "revenue", "net sales", "total income"],
  profit: ["net profit", "profit after tax", "pat", "profit"],
  eps: ["eps", "earnings per share"],
  pe: ["pe", "p/e", "price to earnings", "price earnings"],
  roe: ["roe", "return on equity"],
  roce: ["roce", "return on capital employed"],
  debtEquity: ["debt/equity", "debt equity", "debt to equity", "d/e"],
  salesGrowth: ["sales growth", "revenue growth"],
  profitGrowth: ["profit growth", "pat growth", "net profit growth"],
  opm: ["opm", "operating margin", "operating profit margin"],
  cfo: ["operating cash flow", "cash from operations", "cash flow from operations", "cfo"],
  currentPrice: ["current price", "price", "ltp", "last traded price"],
  fiiHolding: ["fii", "fii holding", "foreign institutional", "foreign institutions"],
  diiHolding: ["dii", "dii holding", "domestic institutional", "domestic institutions"],
  institutionalHolding: ["institutional holding", "institutional", "institutions", "total institutions"],
  dvmDurability: ["dvm durability", "durability", "durability score"],
  dvmValuation: ["dvm valuation", "valuation score", "valuation"],
  dvmMomentum: ["dvm momentum", "momentum", "momentum score"],
  analystScore: ["analyst score", "analyst rating", "broker score", "recommendation score", "broker recommendation"]
};

function aliasMatches(value: string, aliases: string[]) {
  const key = normalizeKey(value);
  return aliases.some((alias) => key === normalizeKey(alias) || key.includes(normalizeKey(alias)));
}

function valueFromKeyValueRows(rows: string[][], aliases: string[]) {
  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      if (!aliasMatches(row[index] || "", aliases)) continue;
      const value = row.slice(index + 1).find((cell) => cleanImportedValue(cell));
      if (value) return cleanImportedValue(value);
    }
  }
  return "";
}

function valuesFromHeaderRows(rows: string[][], fallbackTicker = "") {
  const output: Partial<Record<keyof typeof trendlyneAliases, string>> = {};
  const fields = Object.keys(trendlyneAliases) as Array<keyof typeof trendlyneAliases>;

  for (let headerIndex = 0; headerIndex < Math.min(rows.length, 20); headerIndex += 1) {
    const headers = rows[headerIndex] || [];
    const matchedFields = fields.filter((field) => headers.some((header) => aliasMatches(header || "", trendlyneAliases[field])));
    if (matchedFields.length < 2) continue;

    const tickerColumn = headers.findIndex((header) => aliasMatches(header || "", trendlyneAliases.ticker));
    const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some(Boolean));
    const matchedRow =
      fallbackTicker && tickerColumn >= 0
        ? dataRows.find((row) => normalizeKey(row[tickerColumn] || "") === normalizeKey(fallbackTicker))
        : dataRows[0];

    if (!matchedRow) continue;
    matchedFields.forEach((field) => {
      const column = headers.findIndex((header) => aliasMatches(header || "", trendlyneAliases[field]));
      if (column >= 0 && matchedRow[column]) output[field] = cleanImportedValue(matchedRow[column]);
    });
    break;
  }

  return output;
}

function extractTrendlyneRows(rows: string[][], fallbackTicker = "", fallbackCompany = ""): FundamentalsRecord {
  const byHeader = valuesFromHeaderRows(rows, fallbackTicker);
  const valueFor = (field: keyof typeof trendlyneAliases) =>
    byHeader[field] || valueFromKeyValueRows(rows, trendlyneAliases[field]);

  const companyName = valueFor("companyName") || fallbackCompany || "Trendlyne company";
  const ticker = (valueFor("ticker") || fallbackTicker).toUpperCase();

  return {
    id: uid(),
    companyName,
    ticker,
    source: "Trendlyne export",
    importedAt: new Date().toISOString(),
    reportDate: "",
    marketCap: valueFor("marketCap"),
    revenue: valueFor("revenue"),
    profit: valueFor("profit"),
    eps: valueFor("eps"),
    pe: valueFor("pe"),
    roe: valueFor("roe"),
    roce: valueFor("roce"),
    debtEquity: valueFor("debtEquity"),
    promoterHolding: "",
    salesGrowth: valueFor("salesGrowth"),
    profitGrowth: valueFor("profitGrowth"),
    opm: valueFor("opm"),
    cfo: valueFor("cfo"),
    currentPrice: valueFor("currentPrice"),
    fiiHolding: valueFor("fiiHolding"),
    diiHolding: valueFor("diiHolding"),
    institutionalHolding: valueFor("institutionalHolding"),
    dvmDurability: valueFor("dvmDurability"),
    dvmValuation: valueFor("dvmValuation"),
    dvmMomentum: valueFor("dvmMomentum"),
    analystScore: valueFor("analystScore")
  };
}

function extractScreenerWorkbook(buffer: ArrayBuffer, fallbackTicker = ""): FundamentalsRecord {
  const files = unzipSync(new Uint8Array(buffer));
  const sharedStrings = files["xl/sharedStrings.xml"] ? parseSharedStrings(strFromU8(files["xl/sharedStrings.xml"])) : [];
  const dataSheetPath = findDataSheetPath(files);
  const cells = parseSheet(strFromU8(files[dataSheetPath]), sharedStrings);
  const latestCol = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2].find((col) => getCell(cells, 16, col)) || 11;
  const priorCol = Math.max(2, latestCol - 1);
  const currentPrice = Number(getCell(cells, 8, 2)) || 0;
  const marketCap = Number(getCell(cells, 9, 2)) || 0;
  const sales = Number(getCell(cells, 17, latestCol)) || 0;
  const priorSales = Number(getCell(cells, 17, priorCol)) || 0;
  const profit = Number(getCell(cells, 30, latestCol)) || 0;
  const priorProfit = Number(getCell(cells, 30, priorCol)) || 0;
  const shares = Number(getCell(cells, 93, latestCol)) || (currentPrice ? marketCap / currentPrice : 0);
  const eps = shares ? profit / shares : 0;
  const rawMaterial = Number(getCell(cells, 18, latestCol)) || 0;
  const inventoryChange = Number(getCell(cells, 19, latestCol)) || 0;
  const operatingExpenses =
    rawMaterial +
    (Number(getCell(cells, 20, latestCol)) || 0) +
    (Number(getCell(cells, 21, latestCol)) || 0) +
    (Number(getCell(cells, 22, latestCol)) || 0) +
    (Number(getCell(cells, 23, latestCol)) || 0) +
    (Number(getCell(cells, 24, latestCol)) || 0) -
    inventoryChange;
  const operatingProfit = sales - operatingExpenses;
  const equity = (Number(getCell(cells, 57, latestCol)) || 0) + (Number(getCell(cells, 58, latestCol)) || 0);
  const borrowings = Number(getCell(cells, 59, latestCol)) || 0;
  const prevCapital =
    (Number(getCell(cells, 57, priorCol)) || 0) + (Number(getCell(cells, 58, priorCol)) || 0) + (Number(getCell(cells, 59, priorCol)) || 0);
  const currentCapital = equity + borrowings;
  const pbt = Number(getCell(cells, 28, latestCol)) || 0;
  const interest = Number(getCell(cells, 27, latestCol)) || 0;
  const reportRaw = getCell(cells, 16, latestCol);
  const companyName = String(getCell(cells, 1, 2) || "").trim();

  return {
    id: uid(),
    companyName,
    ticker: fallbackTicker.toUpperCase(),
    source: "Screener Excel export",
    importedAt: new Date().toISOString(),
    reportDate: typeof reportRaw === "number" ? excelDate(reportRaw) : String(reportRaw || ""),
    marketCap: formatNumber(marketCap),
    revenue: formatNumber(sales, 0),
    profit: formatNumber(profit, 0),
    eps: formatNumber(eps),
    pe: eps && currentPrice ? formatNumber(currentPrice / eps) : "",
    roe: equity ? formatNumber((profit / equity) * 100) : "",
    roce: prevCapital + currentCapital ? formatNumber(((pbt + interest) * 2 * 100) / (prevCapital + currentCapital)) : "",
    debtEquity: equity ? formatNumber(borrowings / equity) : "",
    promoterHolding: "",
    salesGrowth: priorSales ? formatNumber(((sales / priorSales) - 1) * 100) : "",
    profitGrowth: priorProfit ? formatNumber(((profit / priorProfit) - 1) * 100) : "",
    opm: sales ? formatNumber((operatingProfit / sales) * 100) : "",
    cfo: formatNumber(Number(getCell(cells, 82, latestCol)) || 0, 0),
    currentPrice: formatNumber(currentPrice),
    fiiHolding: "",
    diiHolding: "",
    institutionalHolding: "",
    dvmDurability: "",
    dvmValuation: "",
    dvmMomentum: "",
    analystScore: ""
  };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function extractNseShareholdingCsv(text: string, fallbackTicker = ""): ShareholdingRecord {
  const rows = parseCsv(text);
  const headers = rows[0] || [];
  const dataRows = rows.slice(1).filter((row) => row.length > 1);
  if (!headers.length || !dataRows.length) throw new Error("NSE shareholding CSV appears to be empty.");

  const indexOf = (name: string) => headers.findIndex((header) => normalizeKey(header) === normalizeKey(name));
  const companyIndex = indexOf("COMPANY");
  const promoterIndex = indexOf("PROMOTER & PROMOTER GROUP (A)");
  const publicIndex = indexOf("PUBLIC (B)");
  const trustIndex = indexOf("SHARES HELD BY EMPLOYEE TRUSTS (C2)");
  const asOnIndex = indexOf("AS ON DATE");
  const submissionIndex = indexOf("SUBMISSION DATE");
  const actionIndex = indexOf("ACTION");

  if (companyIndex === -1 || promoterIndex === -1 || publicIndex === -1 || asOnIndex === -1) {
    throw new Error("This does not look like an NSE shareholding pattern CSV.");
  }

  const history = dataRows.map((row) => ({
    asOnDate: row[asOnIndex] || "",
    promoterHolding: row[promoterIndex] || "",
    publicHolding: row[publicIndex] || "",
    employeeTrusts: trustIndex >= 0 ? row[trustIndex] || "" : "",
    submissionDate: submissionIndex >= 0 ? row[submissionIndex] || "" : "",
    xbrlUrl: actionIndex >= 0 ? row[actionIndex] || "" : ""
  }));
  const latest = history[0];
  const companyName = dataRows[0][companyIndex] || "";

  return {
    id: uid(),
    companyName,
    ticker: fallbackTicker.toUpperCase(),
    source: "NSE shareholding CSV",
    importedAt: new Date().toISOString(),
    asOnDate: latest.asOnDate,
    submissionDate: latest.submissionDate,
    promoterHolding: latest.promoterHolding,
    publicHolding: latest.publicHolding,
    employeeTrusts: latest.employeeTrusts,
    xbrlUrl: latest.xbrlUrl,
    history
  };
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<AppData>({
    companies: [demoCompany()],
    portfolio: [],
    fundamentals: {},
    shareholding: {},
    trendlyne: {}
  });
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedId, setSelectedId] = useState("");
  const [sideQuery, setSideQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>(starterCompanies);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState("Search NSE and BSE companies, then sync richer evidence from Data.");
  const [trendlyneStatus, setTrendlyneStatus] = useState<TrendlyneStatus | null>(null);
  const [trendlyneLoading, setTrendlyneLoading] = useState(false);
  const [syncingSymbol, setSyncingSymbol] = useState("");
  const [reportFetching, setReportFetching] = useState(false);
  const [generatedReportAvailable, setGeneratedReportAvailable] = useState(false);
  const [generatedReportChecking, setGeneratedReportChecking] = useState(false);
  const [packetBridgeMessage, setPacketBridgeMessage] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppData>;
        const companies = (parsed.companies || []).map(normalizeCompany);
        setData({
          companies: companies.length ? companies : [demoCompany()],
          portfolio: parsed.portfolio || [],
          fundamentals: parsed.fundamentals || {},
          shareholding: parsed.shareholding || {},
          trendlyne: parsed.trendlyne || {}
        });
        setSelectedId(companies[0]?.id || "");
      } else {
        const sample = demoCompany();
        setData({ companies: [sample], portfolio: [], fundamentals: {}, shareholding: {}, trendlyne: {} });
        setSelectedId(sample.id);
      }
    } catch {
      const sample = demoCompany();
      setData({ companies: [sample], portfolio: [], fundamentals: {}, shareholding: {}, trendlyne: {} });
      setSelectedId(sample.id);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    refreshTrendlyneStatus();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`/api/company-search?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal
        });
        const payload = (await response.json()) as {
          results?: CompanySearchResult[];
          source?: string;
          message?: string;
        };
        setSearchResults(payload.results || []);
        setSearchMessage(payload.message || "Showing exchange directory results.");
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setSearchMessage("Search failed. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery, hydrated]);

  const selected = data.companies.find((company) => company.id === selectedId) || data.companies[0];

  useEffect(() => {
    if (!hydrated || !selected?.ticker) {
      setGeneratedReportAvailable(false);
      setGeneratedReportChecking(false);
      return;
    }

    const controller = new AbortController();
    async function checkGeneratedReport() {
      setGeneratedReportChecking(true);
      try {
        for (const url of generatedReportUrls(selected.ticker)) {
          const response = await fetch(url, { cache: "no-store", method: "HEAD", signal: controller.signal });
          if (response.ok) {
            setGeneratedReportAvailable(true);
            return;
          }
        }
        setGeneratedReportAvailable(false);
      } catch {
        if (!controller.signal.aborted) setGeneratedReportAvailable(false);
      } finally {
        if (!controller.signal.aborted) setGeneratedReportChecking(false);
      }
    }

    void checkGeneratedReport();
    return () => controller.abort();
  }, [hydrated, selected?.ticker, selected?.codexReports?.length]);

  const filteredMini = data.companies.filter((company) =>
    `${company.name} ${company.ticker}`.toLowerCase().includes(sideQuery.toLowerCase())
  );
  const ranked = useMemo(
    () =>
      [...data.companies].sort((a, b) => {
        const progressA = (a.codexReports?.length ? 2 : 0) + (a.dataSource ? 1 : 0);
        const progressB = (b.codexReports?.length ? 2 : 0) + (b.dataSource ? 1 : 0);
        return progressB - progressA || a.name.localeCompare(b.name);
      }),
    [data.companies]
  );

  function saveCompany(next: Company) {
    setData((current) => ({
      ...current,
      companies: current.companies.map((company) => (company.id === next.id ? next : company))
    }));
  }

  function findFundamentals(ticker: string, companyName: string, source = data.fundamentals) {
    const normalizedName = normalizeKey(companyName);
    return (
      Object.values(source).find((record) => record.ticker && tickersMatch(record.ticker, ticker)) ||
      Object.values(source).find((record) => {
        const recordName = normalizeKey(record.companyName);
        return recordName.includes(normalizedName) || normalizedName.includes(recordName);
      })
    );
  }

  function findShareholding(ticker: string, companyName: string, source = data.shareholding) {
    const normalizedName = normalizeKey(companyName);
    return (
      Object.values(source).find((record) => record.ticker && tickersMatch(record.ticker, ticker)) ||
      Object.values(source).find((record) => {
        const recordName = normalizeKey(record.companyName);
        return recordName.includes(normalizedName) || normalizedName.includes(recordName);
      })
    );
  }

  function findTrendlyneIntelligence(ticker: string, companyName: string, source = data.trendlyne) {
    const normalizedName = normalizeKey(companyName);
    return (
      Object.values(source).find((record) => record.ticker && tickersMatch(record.ticker, ticker)) ||
      Object.values(source).find((record) => {
        const recordName = normalizeKey(record.companyName);
        return recordName.includes(normalizedName) || normalizedName.includes(recordName);
      })
    );
  }

  function applyFundamentals(company: Company, record?: FundamentalsRecord) {
    if (!record) return company;
    const priceForPe = asNumber(record.currentPrice) || asNumber(company.financials.currentPrice);
    const eps = asNumber(record.eps);
    const recordPe = asNumber(record.pe);
    const impliedEps = !eps && priceForPe && recordPe ? formatNumber(priceForPe / recordPe) : "";

    return {
      ...company,
      marketCap: record.marketCap || company.marketCap,
      dataSource: `${company.dataSource || "Company search"} + ${record.source} (${record.reportDate || record.importedAt.slice(0, 10)})`,
      financials: {
        ...company.financials,
        revenue: record.revenue || company.financials.revenue,
        profit: record.profit || company.financials.profit,
        eps: record.eps || company.financials.eps || impliedEps,
        pe: eps && priceForPe ? formatNumber(priceForPe / eps) : record.pe || company.financials.pe,
        roe: record.roe || company.financials.roe,
        roce: record.roce || company.financials.roce,
        debtEquity: record.debtEquity || company.financials.debtEquity,
        promoterHolding: record.promoterHolding || company.financials.promoterHolding,
        fiiHolding: record.fiiHolding || company.financials.fiiHolding,
        diiHolding: record.diiHolding || company.financials.diiHolding,
        institutionalHolding: record.institutionalHolding || company.financials.institutionalHolding,
        salesGrowth: record.salesGrowth || company.financials.salesGrowth,
        profitGrowth: record.profitGrowth || company.financials.profitGrowth,
        opm: record.opm || company.financials.opm,
        cfo: record.cfo || company.financials.cfo,
        currentPrice: record.currentPrice || company.financials.currentPrice,
        dvmDurability: record.dvmDurability || company.financials.dvmDurability,
        dvmValuation: record.dvmValuation || company.financials.dvmValuation,
        dvmMomentum: record.dvmMomentum || company.financials.dvmMomentum,
        analystScore: record.analystScore || company.financials.analystScore
      }
    };
  }

  function applyShareholding(company: Company, record?: ShareholdingRecord) {
    if (!record) return company;

    return {
      ...company,
      dataSource: `${company.dataSource || "Company search"} + ${record.source} (${record.asOnDate || record.importedAt.slice(0, 10)})`,
      financials: {
        ...company.financials,
        promoterHolding: record.promoterHolding || company.financials.promoterHolding
      }
    };
  }

  async function fetchNseShareholding(symbol: string) {
    const response = await fetch(`/api/nse/shareholding?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { record?: ShareholdingRecord; error?: string };
    if (!response.ok || !payload.record) {
      throw new Error(payload.error || "No NSE shareholding record found.");
    }
    return payload.record;
  }

  async function fetchNseFinancials(symbol: string) {
    const response = await fetch(`/api/nse/financials?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { record?: FundamentalsRecord; error?: string };
    if (!response.ok || !payload.record) {
      throw new Error(payload.error || "No NSE financial result found.");
    }
    return payload.record;
  }

  async function fetchBseShareholding(code: string) {
    const response = await fetch(`/api/bse/shareholding?code=${encodeURIComponent(code)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { record?: ShareholdingRecord; error?: string };
    if (!response.ok || !payload.record) {
      throw new Error(payload.error || "No BSE shareholding record found.");
    }
    return payload.record;
  }

  async function fetchBseFinancials(code: string) {
    const response = await fetch(`/api/bse/financials?code=${encodeURIComponent(code)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { record?: FundamentalsRecord; error?: string };
    if (!response.ok || !payload.record) {
      throw new Error(payload.error || "No BSE financial record found.");
    }
    return payload.record;
  }

  async function fetchTrendlyneCompany(symbol: string) {
    const response = await fetch(`/api/trendlyne/company?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { record?: FundamentalsRecord; error?: string };
    if (!response.ok || !payload.record) {
      throw new Error(payload.error || "No Trendlyne MCP record found.");
    }
    return payload.record;
  }

  async function fetchTrendlyneIntelligence(symbol: string) {
    const response = await fetch(`/api/trendlyne/intelligence?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { record?: TrendlyneIntelligenceRecord; error?: string };
    if (!response.ok || !payload.record) {
      throw new Error(payload.error || "No Trendlyne MCP intelligence record found.");
    }
    return payload.record;
  }

  async function syncNseShareholding(company = selected) {
    if (!company?.ticker) {
      window.alert("Select a company with a ticker first.");
      return;
    }
    const isBseRecord = company.exchange === "BSE";
    const lookupSymbol = isBseRecord ? bseLookupCode(company) : externalLookupTicker(company.ticker);
    if (!lookupSymbol) {
      window.alert("This BSE record needs a BSE scrip code before direct filing sync can run.");
      return;
    }

    setSyncingSymbol(company.ticker);
    try {
      const record = isBseRecord ? await fetchBseShareholding(lookupSymbol) : await fetchNseShareholding(lookupSymbol);
      const key = record.ticker || company.ticker;
      setData((current) => ({
        ...current,
        shareholding: { ...current.shareholding, [key]: record },
        companies: current.companies.map((item) => {
          const matchesTicker = tickersMatch(item.ticker, company.ticker);
          const matchesName = normalizeKey(record.companyName).includes(normalizeKey(item.name));
          return matchesTicker || matchesName ? applyShareholding(item, record) : item;
        })
      }));
      setSelectedId(company.id);
      window.alert(
        `Synced ${isBseRecord ? "BSE" : "NSE"} shareholding for ${record.companyName}: promoter holding ${
          record.promoterHolding || "-"
        }%.`
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not sync exchange shareholding.");
    } finally {
      setSyncingSymbol("");
    }
  }

  async function syncNseFinancials(company = selected) {
    if (!company?.ticker) {
      window.alert("Select a company with a ticker first.");
      return;
    }
    const isBseRecord = company.exchange === "BSE";
    const lookupSymbol = isBseRecord ? bseLookupCode(company) : externalLookupTicker(company.ticker);
    if (!lookupSymbol) {
      window.alert("This BSE record needs a BSE scrip code before direct financial sync can run.");
      return;
    }

    setSyncingSymbol(company.ticker);
    try {
      const record = isBseRecord ? await fetchBseFinancials(lookupSymbol) : await fetchNseFinancials(lookupSymbol);
      const key = record.ticker || company.ticker;
      setData((current) => ({
        ...current,
        fundamentals: { ...current.fundamentals, [key]: record },
        companies: current.companies.map((item) => {
          const matchesTicker = tickersMatch(item.ticker, company.ticker);
          const matchesName = normalizeKey(record.companyName).includes(normalizeKey(item.name));
          return matchesTicker || matchesName ? applyFundamentals(item, record) : item;
        })
      }));
      setSelectedId(company.id);
      window.alert(
        `Synced ${isBseRecord ? "BSE" : "NSE"} financials for ${record.companyName}: ${
          record.revenue ? `sales INR ${record.revenue} cr` : `price INR ${record.currentPrice || "-"}`
        }.`
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not sync exchange financials.");
    } finally {
      setSyncingSymbol("");
    }
  }

  async function refreshTrendlyneStatus() {
    setTrendlyneLoading(true);
    try {
      const response = await fetch("/api/trendlyne/status", { cache: "no-store" });
      const status = (await response.json()) as TrendlyneStatus;
      setTrendlyneStatus(status);
    } catch {
      setTrendlyneStatus({
        urlConfigured: false,
        tokenConfigured: false,
        apiKeyConfigured: false,
        connected: false,
        error: "Could not check Trendlyne MCP."
      });
    } finally {
      setTrendlyneLoading(false);
    }
  }

  async function syncTrendlyneCompany(company = selected) {
    if (!company?.ticker) {
      window.alert("Select a company with a ticker first.");
      return;
    }

    setSyncingSymbol(company.ticker);
    try {
      const lookupSymbol = externalLookupTicker(company.ticker);
      const [record, intelligence] = await Promise.all([
        fetchTrendlyneCompany(lookupSymbol),
        fetchTrendlyneIntelligence(lookupSymbol).catch(() => undefined)
      ]);
      const key = record.ticker || company.ticker;
      const intelligenceKey = intelligence?.ticker || key;
      setData((current) => ({
        ...current,
        fundamentals: { ...current.fundamentals, [key]: record },
        trendlyne: intelligence ? { ...current.trendlyne, [intelligenceKey]: intelligence } : current.trendlyne,
        companies: current.companies.map((item) => {
          const matchesTicker = tickersMatch(item.ticker, company.ticker);
          const matchesName = normalizeKey(record.companyName).includes(normalizeKey(item.name));
          if (!matchesTicker && !matchesName) return item;
          const withFundamentals = applyFundamentals(item, record);
          return intelligence ? enrichWithTrendlyne(withFundamentals, record, intelligence) : withFundamentals;
        })
      }));
      setSelectedId(company.id);
      setActivePage("research");
      setActiveTab(intelligence ? "report" : "financials");
      window.alert(`Synced Trendlyne MCP data for ${record.companyName}${intelligence ? " with full intelligence pack" : ""}.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not sync Trendlyne MCP data.");
    } finally {
      setSyncingSymbol("");
    }
  }

  function createCompany() {
    const company = blankCompany();
    setData((current) => ({ ...current, companies: [company, ...current.companies] }));
    setSelectedId(company.id);
    setActiveTab("overview");
    setActivePage("research");
  }

  async function importStarterCompany(item: CompanySearchResult) {
    const existing = data.companies.find((company) => companiesMatch(company, item));
    if (existing) {
      setSelectedId(existing.id);
      setActivePage("research");
      if ((!existing.exchange || existing.exchange === "NSE" || existing.exchange === "BSE") && !existing.financials.promoterHolding) {
        await syncNseShareholding(existing);
      }
      if (
        (!existing.exchange || existing.exchange === "NSE" || existing.exchange === "BSE") &&
        (!existing.financials.revenue || !existing.financials.profit)
      ) {
        await syncNseFinancials(existing);
      }
      return;
    }

    const company: Company = {
      ...blankCompany(),
      name: item.name,
      ticker: item.ticker,
      exchange: item.exchange || "",
      bseCode: item.bseCode || "",
      isin: item.isin || "",
      listedSeries: item.listedSeries || "",
      sector: item.sector,
      marketCap: item.marketCap,
      status: "Researching",
      dataSource: `${item.source || item.exchange || "Company search"}, imported ${new Date().toISOString().slice(0, 10)}`,
      businessSummary: item.note,
      industryOpportunity: "Add primary-source evidence from filings, presentations and industry data.",
      financials: {
        ...blankFinancials(),
        currentPrice: item.currentPrice,
        pe: item.pe,
        roe: item.roe,
        roce: item.roce,
        debtEquity: item.debtEquity,
        promoterHolding: item.promoterHolding,
        salesGrowth: item.salesGrowth,
        profitGrowth: item.profitGrowth
      }
    };
    let fetchedShareholding: ShareholdingRecord | undefined;
    let fetchedFinancials: FundamentalsRecord | undefined;
    setSyncingSymbol(item.ticker);
    try {
      if (item.exchange === "NSE") {
        const lookupSymbol = externalLookupTicker(item.ticker);
        [fetchedShareholding, fetchedFinancials] = await Promise.all([
          fetchNseShareholding(lookupSymbol).catch(() => undefined),
          fetchNseFinancials(lookupSymbol).catch(() => undefined)
        ]);
      } else if (item.exchange === "BSE") {
        const lookupCode = item.bseCode || (/^\d+$/.test(item.ticker) ? item.ticker : "");
        if (lookupCode) {
          [fetchedShareholding, fetchedFinancials] = await Promise.all([
            fetchBseShareholding(lookupCode).catch(() => undefined),
            fetchBseFinancials(lookupCode).catch(() => undefined)
          ]);
        }
      }
    } catch {
      fetchedShareholding = undefined;
      fetchedFinancials = undefined;
    } finally {
      setSyncingSymbol("");
    }

    const matchedShareholding = fetchedShareholding || findShareholding(item.ticker, item.name);
    const matchedFinancials = fetchedFinancials || findFundamentals(item.ticker, item.name);
    const enrichedCompany = applyShareholding(applyFundamentals(company, matchedFinancials), matchedShareholding);
    const shareholdingKey = fetchedShareholding?.ticker || item.ticker;
    const fundamentalsKey = fetchedFinancials?.ticker || item.ticker;

    setData((current) => ({
      ...current,
      shareholding: fetchedShareholding ? { ...current.shareholding, [shareholdingKey]: fetchedShareholding } : current.shareholding,
      fundamentals: fetchedFinancials ? { ...current.fundamentals, [fundamentalsKey]: fetchedFinancials } : current.fundamentals,
      companies: [enrichedCompany, ...current.companies]
    }));
    setSelectedId(enrichedCompany.id);
    setActivePage("research");
  }

  function deleteCompany() {
    if (!selected) return;
    const confirmed = window.confirm(`Delete ${selected.name}?`);
    if (!confirmed) return;
    const remaining = data.companies.filter((company) => company.id !== selected.id);
    setData((current) => ({ ...current, companies: remaining }));
    setSelectedId(remaining[0]?.id || "");
    setActivePage("dashboard");
  }

  function downloadJson(filename: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportWorkspaceBackup() {
    downloadJson(`IMRS-Workspace-Backup-${new Date().toISOString().slice(0, 10)}.json`, data);
  }

  async function importWorkspaceBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, "")) as Partial<AppData>;
      if (!Array.isArray(parsed.companies)) throw new Error("This file is not an IMRS workspace backup.");
      const companies = parsed.companies.map(normalizeCompany);
      setData({
        companies: companies.length ? companies : [demoCompany()],
        portfolio: parsed.portfolio || [],
        fundamentals: parsed.fundamentals || {},
        shareholding: parsed.shareholding || {},
        trendlyne: parsed.trendlyne || {}
      });
      setSelectedId(companies[0]?.id || "");
      setActivePage("dashboard");
      window.alert(`Restored workspace backup with ${companies.length} companies.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not restore this workspace backup.");
    } finally {
      event.target.value = "";
    }
  }

  async function sendPacketToCodexBridge(filename: string, packet: unknown) {
    try {
      const response = await fetch("http://127.0.0.1:43117/packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, packet })
      });
      const payload = (await response.json()) as { ok?: boolean; latestPath?: string; signalPath?: string; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Local Codex bridge did not accept the packet.");
      setPacketBridgeMessage(`Auto-staged for Codex: ${payload.latestPath}${payload.signalPath ? `; signal ${payload.signalPath}` : ""}`);
    } catch {
      setPacketBridgeMessage("Downloaded. Auto-stage is off; run npm run packet:bridge to enable one-click Codex staging.");
    }
  }

  function exportCodexResearchPacket() {
    if (!selected) return;
    const fundamentalsRecord = findFundamentals(selected.ticker, selected.name);
    const shareholdingRecord = findShareholding(selected.ticker, selected.name);
    const trendlyneIntel = findTrendlyneIntelligence(selected.ticker, selected.name);
    const packet = buildCleanCodexResearchPacket(selected, fundamentalsRecord, shareholdingRecord, trendlyneIntel);
    const filename = `${safeFileName(selected.ticker || selected.name)}-IMRS-Codex-Research-Packet-${new Date().toISOString().slice(0, 10)}.json`;

    downloadJson(filename, packet);
    setPacketBridgeMessage("Packet downloaded. Checking local Codex bridge...");
    void sendPacketToCodexBridge(filename, packet);
  }

  function reportContentFromPayload(text: string, fallbackTitle: string) {
    const cleanText = text.replace(/^\uFEFF/, "");
    let title = fallbackTitle;
    let content = cleanText;
    let format = fallbackTitle.split(".").pop()?.toLowerCase() || "txt";

    if (format === "json") {
      const parsed = JSON.parse(cleanText) as CodexReportPayload;
      title = parsed.title || fallbackTitle.replace(/\.[^.]+$/, "");
      content = parsed.report || parsed.markdown || parsed.content || cleanText;
      format = "json";
    } else {
      title = fallbackTitle.replace(/\.[^.]+$/, "");
    }

    if (!content.trim()) throw new Error("The report file is empty.");
    return { title, content, format };
  }

  function saveCodexReport(title: string, content: string, format: string) {
    if (!selected) return;
    const importedReport: CodexReport = {
      id: uid(),
      title,
      importedAt: new Date().toISOString(),
      format,
      content
    };

    updateSelected({
      aiOutput: content,
      codexReports: [importedReport, ...(selected.codexReports || [])],
      documents: mergeDocuments(selected.documents, [{ name: title, type: "Other", status: "Key Source" }])
    });
    setActiveTab("report");
  }

  async function importCodexReport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selected) return;

    try {
      const { title, content, format } = reportContentFromPayload(await file.text(), file.name);
      saveCodexReport(title, content, format);
      window.alert("Codex report imported into this company record.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import this Codex report.");
    } finally {
      event.target.value = "";
    }
  }

  async function fetchGeneratedReport(company = selected) {
    if (!company?.ticker) {
      window.alert("Select a company with a ticker first.");
      return;
    }

    const lookupSymbol = externalLookupTicker(company.ticker);
    const candidates = generatedReportUrls(company.ticker);
    setReportFetching(true);
    try {
      let response: Response | undefined;
      let reportUrl = "";
      for (const url of candidates) {
        const attempt = await fetch(url, { cache: "no-store" });
        if (attempt.ok) {
          response = attempt;
          reportUrl = url;
          break;
        }
      }
      if (!response) throw new Error(`No generated report found for ${lookupSymbol}. Generate it into public/reports/${lookupSymbol}.json and redeploy.`);
      const { title, content, format } = reportContentFromPayload(await response.text(), reportUrl.split("/").pop() || `${lookupSymbol}.json`);
      saveCodexReport(title, content, format);
      window.alert(`Fetched generated report for ${lookupSymbol}.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not fetch the generated report.");
    } finally {
      setReportFetching(false);
    }
  }

  async function importFundamentals(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const extracted = extractScreenerWorkbook(await file.arrayBuffer());
      const nameMatch = data.companies.find((company) => {
        const recordName = normalizeKey(extracted.companyName);
        const companyName = normalizeKey(company.name);
        return recordName.includes(companyName) || companyName.includes(recordName);
      });
      const record = { ...extracted, ticker: nameMatch?.ticker || extracted.ticker };
      const key = record.ticker || normalizeKey(record.companyName);
      const nextFundamentals = { ...data.fundamentals, [key]: record };
      const matchedCompany = data.companies.find((company) => findFundamentals(company.ticker, company.name, nextFundamentals));

      setData((current) => ({
        ...current,
        fundamentals: nextFundamentals,
        companies: current.companies.map((company) => {
          const match = findFundamentals(company.ticker, company.name, nextFundamentals);
          return match ? applyFundamentals(company, match) : company;
        })
      }));

      if (matchedCompany) {
        setSelectedId(matchedCompany.id);
      }
      setActivePage("fundamentals");
      window.alert(`Imported fundamentals for ${record.companyName}.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import this Screener workbook.");
    } finally {
      event.target.value = "";
    }
  }

  async function importTrendlyne(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = file.name.toLowerCase().endsWith(".csv")
        ? parseCsv(await file.text())
        : extractWorkbookRows(await file.arrayBuffer());
      const extracted = extractTrendlyneRows(rows, selected?.ticker || "", selected?.name || "");
      const nameMatch = data.companies.find((company) => {
        const tickerMatch = extracted.ticker && tickersMatch(company.ticker, extracted.ticker);
        const recordName = normalizeKey(extracted.companyName);
        const companyName = normalizeKey(company.name);
        return tickerMatch || recordName.includes(companyName) || companyName.includes(recordName);
      });
      const record = { ...extracted, ticker: nameMatch?.ticker || extracted.ticker };
      const key = record.ticker || normalizeKey(record.companyName);
      const nextFundamentals = { ...data.fundamentals, [key]: record };
      const matchedCompany = data.companies.find((company) => findFundamentals(company.ticker, company.name, nextFundamentals));

      setData((current) => ({
        ...current,
        fundamentals: nextFundamentals,
        companies: current.companies.map((company) => {
          const match = findFundamentals(company.ticker, company.name, nextFundamentals);
          return match ? applyFundamentals(company, match) : company;
        })
      }));

      if (matchedCompany) {
        setSelectedId(matchedCompany.id);
      }
      setActivePage("fundamentals");
      window.alert(`Imported Trendlyne data for ${record.companyName}.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import this Trendlyne export.");
    } finally {
      event.target.value = "";
    }
  }

  async function importShareholding(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const extracted = extractNseShareholdingCsv(await file.text());
      const nameMatch = data.companies.find((company) => {
        const recordName = normalizeKey(extracted.companyName);
        const companyName = normalizeKey(company.name);
        return recordName.includes(companyName) || companyName.includes(recordName);
      });
      const record = { ...extracted, ticker: nameMatch?.ticker || extracted.ticker };
      const key = record.ticker || normalizeKey(record.companyName);
      const nextShareholding = { ...data.shareholding, [key]: record };
      const matchedCompany = data.companies.find((company) => findShareholding(company.ticker, company.name, nextShareholding));

      setData((current) => ({
        ...current,
        shareholding: nextShareholding,
        companies: current.companies.map((company) => {
          const match = findShareholding(company.ticker, company.name, nextShareholding);
          return match ? applyShareholding(company, match) : company;
        })
      }));

      if (matchedCompany) {
        setSelectedId(matchedCompany.id);
      }
      setActivePage("fundamentals");
      window.alert(`Imported NSE shareholding for ${record.companyName}.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import this NSE shareholding CSV.");
    } finally {
      event.target.value = "";
    }
  }

  function updateSelected(patch: Partial<Company>) {
    if (!selected) return;
    saveCompany({ ...selected, ...patch });
  }

  function updateFinancial(key: keyof Financials, value: string) {
    if (!selected) return;
    saveCompany({ ...selected, financials: { ...selected.financials, [key]: value } });
  }

  function exportSelectedReportPdf() {
    if (!selected) return;
    const trendlyneIntel = findTrendlyneIntelligence(selected.ticker, selected.name);
    const record = findFundamentals(selected.ticker, selected.name);
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      window.alert("Chrome blocked the report window. Allow pop-ups for IMRS, then try Export PDF again.");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(buildPrintableReportHtml(selected, trendlyneIntel, record));
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => {
      reportWindow.print();
    }, 500);
  }

  function renderDashboard() {
    const companies = data.companies;
    const reports = companies.reduce((sum, company) => sum + (company.codexReports?.length || 0), 0);
    const dataReady = companies.filter(
      (company) => Boolean(findFundamentals(company.ticker, company.name)) || Boolean(findTrendlyneIntelligence(company.ticker, company.name))
    ).length;
    const selectedLabel = selected?.ticker || selected?.name || "-";

    return (
      <>
        <PageHead eyebrow="Research workflow" title="IMRS">
          Collect evidence, hand it to Codex, then publish a stock-only research report.
        </PageHead>
        <div className="stats">
          <Stat label="Companies" value={companies.length} />
          <Stat label="Evidence ready" value={dataReady} />
          <Stat label="Final reports" value={reports} />
          <Stat label="Selected" value={selectedLabel} />
        </div>
        <section className="panel workflow-panel">
          <span className="eyebrow">Only what matters</span>
          <div className="workflow-grid">
            <article>
              <strong>1. Search</strong>
              <p>Search by ticker or company name and create the record.</p>
            </article>
            <article>
              <strong>2. Sync</strong>
              <p>Collect market, financial, ownership and filing evidence.</p>
            </article>
            <article>
              <strong>3. Export</strong>
              <p>Send the structured evidence packet to Codex for dynamic analysis.</p>
            </article>
            <article>
              <strong>4. Publish</strong>
              <p>Store the finished stock-only report and export the PDF from IMRS.</p>
            </article>
          </div>
        </section>
        <div className="portfolio-grid">
          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">Company records</span>
                <h2>Research queue</h2>
              </div>
              <button onClick={createCompany} title="Create company">
                <Plus size={17} /> Company
              </button>
            </div>
            <CompanyTable companies={ranked} openCompany={openCompany} />
          </section>
          <aside className="panel">
            <span className="eyebrow">Operating model</span>
            <h3>Website stays light</h3>
            <div className="kpi-list">
              <Kpi label="Input" value="Market evidence" />
              <Kpi label="Analysis" value="Codex" />
              <Kpi label="Output" value="Report + PDF" />
            </div>
            <div className="note">
              No portfolio tracker, committee simulator or redundant scoring screens. IMRS is now a clean evidence-to-report workspace.
            </div>
            <div className="side-title">Workspace safety</div>
            <div className="toolbar">
              <button className="secondary" onClick={exportWorkspaceBackup}>
                <Download size={17} /> Backup data
              </button>
              <label className="secondary file-button">
                <Upload size={17} /> Restore backup
                <input type="file" accept=".json" onChange={importWorkspaceBackup} />
              </label>
            </div>
            <div className="note">
              All research is saved only in this browser. Download a backup regularly; restoring replaces the current workspace.
            </div>
          </aside>
        </div>
      </>
    );
  }

  function openCompany(id: string) {
    setSelectedId(id);
    setActiveTab("report");
    setActivePage("research");
  }

  function renderSearch() {
    return (
      <>
        <PageHead eyebrow="Company discovery" title="Company Search">
          Search NSE and BSE companies, then import a company into your research workspace.
        </PageHead>
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (searchResults.length === 1) importStarterCompany(searchResults[0]);
          }}
        >
          <div className="toolbar">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by company name, NSE ticker or BSE code"
            />
          </div>
          <div className="stack">
            {searchLoading ? <p>Searching...</p> : null}
            {searchResults.map((company) => (
              <div className="result-card" key={`${company.exchange}-${company.ticker}`}>
                <div>
                  <strong>{company.name}</strong>
                  <small>
                    {company.ticker} - {company.exchange}
                    {company.bseCode ? ` - BSE ${company.bseCode}` : ""}
                    {company.isin ? ` - ${company.isin}` : ""}
                    {company.sector ? ` - ${company.sector}` : ""}
                  </small>
                  <small>{company.source || "Company directory"}</small>
                  <small>{company.note}</small>
                </div>
                <button type="button" onClick={() => importStarterCompany(company)} title="Import company">
                  <Plus size={17} /> Import
                </button>
              </div>
            ))}
            {!searchLoading && searchQuery && searchResults.length === 0 ? <p>No matching company found.</p> : null}
          </div>
          <div className="info">{searchMessage}</div>
        </form>
      </>
    );
  }

  function renderFundamentals() {
    const records = Object.values(data.fundamentals).sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    const shareholdingRecords = Object.values(data.shareholding).sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    const selectedExchange = selected?.exchange || "NSE";
    const selectedHasExchangeSync = Boolean(selected?.ticker) && (selectedExchange !== "BSE" || Boolean(bseLookupCode(selected)));

    return (
      <>
        <PageHead eyebrow="Evidence collection" title="Data Hub">
          Collect the raw market, financial, ownership and filing evidence needed for the final stock report.
        </PageHead>
        <section className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Research data connector</span>
              <h2>Market intelligence sync</h2>
            </div>
            <div className="top-actions">
              <button className="secondary" onClick={refreshTrendlyneStatus} disabled={trendlyneLoading}>
                <Download size={17} /> {trendlyneLoading ? "Checking" : "Check connection"}
              </button>
              <button onClick={() => syncTrendlyneCompany()} disabled={!selected?.ticker || Boolean(syncingSymbol)}>
                <Download size={17} /> {syncingSymbol ? "Syncing" : "Sync selected company"}
              </button>
            </div>
          </div>
          <div className="stats compact-stats">
            <Stat label="MCP URL" value={trendlyneStatus?.urlConfigured ? "Configured" : "Missing"} />
            <Stat
              label="Auth"
              value={
                trendlyneStatus?.tokenConfigured || trendlyneStatus?.apiKeyConfigured
                  ? "Configured"
                  : trendlyneStatus?.connected
                    ? "Implicit"
                    : "Not set"
              }
            />
            <Stat label="Connection" value={trendlyneStatus?.connected ? "Connected" : "Not connected"} />
            <Stat label="Tools" value={trendlyneStatus?.toolCount ? String(trendlyneStatus.toolCount) : "0"} />
          </div>
          <div className={trendlyneStatus?.connected ? "info" : "note"}>
            {trendlyneStatus?.connected
              ? "The data connector is reachable. IMRS can now collect company evidence for the report packet."
              : trendlyneStatus?.error || trendlyneStatus?.message || "Add the data connector URL in Vercel to enable this sync."}
          </div>
          {trendlyneStatus?.tools?.length ? (
            <div className="tag-row">
              {trendlyneStatus.tools.slice(0, 8).map((tool) => (
                <span className="tag" title={tool.description} key={tool.name}>
                  {tool.name}
                </span>
              ))}
            </div>
          ) : null}
        </section>
        <section className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Exchange filing</span>
              <h2>Exchange Financial Results</h2>
            </div>
            <button className="secondary" onClick={() => syncNseFinancials()} disabled={!selectedHasExchangeSync || Boolean(syncingSymbol)}>
              <Download size={17} /> {syncingSymbol ? "Syncing" : `Sync ${selectedExchange} Financials`}
            </button>
          </div>
          <div className="info">
            Sync exchange filings for the selected company. NSE records can fill annual sales, profit, EPS and margin
            fields where available. BSE records fill latest price, P/E, EPS, ROE, operating margin and the annual result
            archive link where available.
          </div>
          <div className="note">Use this as evidence collection only. The final interpretation happens in the stock report.</div>
        </section>
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Subscription data</span>
              <h2>Financial data export</h2>
            </div>
            <label className="file-button">
              <Upload size={17} /> Upload export
              <input type="file" accept=".csv,.xlsx" onChange={importTrendlyne} />
            </label>
          </div>
          <div className="info">
            Upload licensed data exports for richer fields such as ROE, ROCE, debt/equity, operating cash
            flow, FII/DII holding, institutional ownership, DVM scores and analyst score.
          </div>
          <div className="note">
            This is a fallback when direct sync does not provide enough detail.
          </div>
        </section>
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Upload fallback</span>
              <h2>Workbook import</h2>
            </div>
            <label className="file-button">
              <Upload size={17} /> Upload Excel
              <input type="file" accept=".xlsx" onChange={importFundamentals} />
            </label>
          </div>
          <div className="info">
            This importer reads company Excel exports. It extracts the Data Sheet and fills
            market cap, revenue, profit, EPS, P/E, ROE, ROCE, debt/equity, growth, OPM and cash flow.
          </div>
          <div className="note">Use workbook upload only when direct data sync is incomplete.</div>
        </section>
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Exchange filing</span>
              <h2>Shareholding pattern</h2>
            </div>
            <div className="top-actions">
              <button className="secondary" onClick={() => syncNseShareholding()} disabled={!selectedHasExchangeSync || Boolean(syncingSymbol)}>
                <Download size={17} /> {syncingSymbol ? "Syncing" : "Sync latest"}
              </button>
              <label className="file-button">
                <Upload size={17} /> Upload CSV
                <input type="file" accept=".csv" onChange={importShareholding} />
              </label>
            </div>
          </div>
          <div className="info">
            IMRS syncs promoter holding directly for NSE and BSE records when possible. Use Sync latest to refresh the
            selected company, or upload a CSV only as a fallback.
          </div>
          <div className="note">This fills the Promoter holding % field from the latest available exchange filing.</div>
        </section>
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Saved fundamentals</span>
              <h2>{records.length} records</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Report</th>
                  <th>Market cap</th>
                  <th>Sales</th>
                  <th>Profit</th>
                  <th>ROCE</th>
                  <th>ROE</th>
                  <th>FII</th>
                  <th>DII</th>
                  <th>DVM</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.companyName}</strong>
                      <small>{record.ticker || "Matched by name"}</small>
                    </td>
                    <td>{record.reportDate || "-"}</td>
                    <td>{record.marketCap || "-"}</td>
                    <td>{record.revenue || "-"}</td>
                    <td>{record.profit || "-"}</td>
                    <td>{record.roce ? `${record.roce}%` : "-"}</td>
                    <td>{record.roe ? `${record.roe}%` : "-"}</td>
                    <td>{record.fiiHolding ? `${record.fiiHolding}%` : "-"}</td>
                    <td>{record.diiHolding ? `${record.diiHolding}%` : "-"}</td>
                    <td>
                      {[record.dvmDurability, record.dvmValuation, record.dvmMomentum].filter(Boolean).join(" / ") || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 ? <p>No Screener or Trendlyne exports imported yet.</p> : null}
          </div>
        </section>
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Saved ownership filings</span>
              <h2>{shareholdingRecords.length} records</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>As on date</th>
                  <th>Promoter</th>
                  <th>Public</th>
                  <th>Employee trusts</th>
                  <th>Filing</th>
                </tr>
              </thead>
              <tbody>
                {shareholdingRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.companyName}</strong>
                      <small>{record.ticker || "Matched by name"}</small>
                    </td>
                    <td>{record.asOnDate || "-"}</td>
                    <td>{record.promoterHolding ? `${record.promoterHolding}%` : "-"}</td>
                    <td>{record.publicHolding ? `${record.publicHolding}%` : "-"}</td>
                    <td>{record.employeeTrusts ? `${record.employeeTrusts}%` : "-"}</td>
                    <td>
                      {record.xbrlUrl ? (
                        <a href={record.xbrlUrl} target="_blank" rel="noreferrer">
                          XBRL
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shareholdingRecords.length === 0 ? <p>No exchange shareholding records imported yet.</p> : null}
          </div>
        </section>
      </>
    );
  }

  function renderResearch() {
    if (!selected) {
      return (
        <>
          <PageHead eyebrow="Research workspace" title="No company selected">
            Create or import a company to begin.
          </PageHead>
          <button onClick={createCompany}>
            <Plus size={17} /> Company
          </button>
        </>
      );
    }

    return (
      <>
        <section className="hero">
          <div className="identity">
            <input className="company-name" value={selected.name} onChange={(event) => updateSelected({ name: event.target.value })} />
            <div className="meta">
              <input
                placeholder="Ticker"
                value={selected.ticker}
                onChange={(event) => updateSelected({ ticker: event.target.value.toUpperCase() })}
              />
              <input placeholder="Sector" value={selected.sector} onChange={(event) => updateSelected({ sector: event.target.value })} />
              <input
                placeholder="Market cap INR cr"
                value={selected.marketCap}
                onChange={(event) => updateSelected({ marketCap: event.target.value })}
                type="number"
              />
              <select value={selected.status} onChange={(event) => updateSelected({ status: event.target.value })}>
                {["Watchlist", "Researching", "Buy Candidate", "Owned", "Avoid", "Exited"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
        <nav className="tabs">
          {tabs.map(([id, label]) => (
            <button className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} key={id}>
              {label}
            </button>
          ))}
        </nav>
        {renderResearchTab(selected)}
        <div className="footer-actions">
          <span>Saved automatically on this device. Source: {selected.dataSource || "Manual entry"}</span>
          <div className="toolbar">
            <button className="danger" onClick={deleteCompany}>
              Delete
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderResearchTab(company: Company) {
    const trendlyneIntel = findTrendlyneIntelligence(company.ticker, company.name);

    if (activeTab === "overview") {
      return (
        <div className="grid-2">
          <TextCard title="Business summary" value={company.businessSummary} onChange={(value) => updateSelected({ businessSummary: value })} />
          <TextCard title="Multibagger case" value={company.multibaggerCase} onChange={(value) => updateSelected({ multibaggerCase: value })} />
          <TextCard title="Industry opportunity" value={company.industryOpportunity} onChange={(value) => updateSelected({ industryOpportunity: value })} />
          <TextCard title="Management assessment" value={company.managementAssessment} onChange={(value) => updateSelected({ managementAssessment: value })} />
        </div>
      );
    }

    if (activeTab === "financials") {
      const financialLabels: Array<[keyof Financials, string]> = [
        ["revenue", "Revenue INR crore"],
        ["profit", "Net profit INR crore"],
        ["eps", "EPS INR"],
        ["pe", "P/E"],
        ["roe", "ROE %"],
        ["roce", "ROCE %"],
        ["debtEquity", "Debt/Equity"],
        ["promoterHolding", "Promoter holding %"],
        ["fiiHolding", "FII holding %"],
        ["diiHolding", "DII holding %"],
        ["institutionalHolding", "Institutional holding %"],
        ["salesGrowth", "Sales growth %"],
        ["profitGrowth", "Profit growth %"],
        ["opm", "Operating margin %"],
        ["cfo", "Operating cash flow INR crore"],
        ["currentPrice", "Current price INR"],
        ["dvmDurability", "DVM durability score"],
        ["dvmValuation", "DVM valuation score"],
        ["dvmMomentum", "DVM momentum score"],
        ["analystScore", "Analyst score"]
      ];
      return (
        <>
          <div className="grid-3">
            {financialLabels.map(([key, label]) => (
              <article className="panel financial-card" key={key}>
                <label>
                  {label}
                  <input value={company.financials[key]} onChange={(event) => updateFinancial(key, event.target.value)} type="number" />
                </label>
              </article>
            ))}
          </div>
          <div className="info">Enter verified numbers from annual reports, exchange filings or trusted financial databases.</div>
        </>
      );
    }

    if (activeTab === "report") {
      const fundamentalsRecord = findFundamentals(company.ticker, company.name);
      const reportText = company.codexReports?.[0]?.content || scrubReportText(company.aiOutput);
      const finalReportCount = company.codexReports?.length || 0;
      const reportLoaded = Boolean(reportText.trim());
      const canFetchReport = Boolean(company.ticker && generatedReportAvailable && !reportFetching);
      const reportActionStatus = reportLoaded
        ? "Final report loaded. PDF export is available."
        : generatedReportChecking
          ? "Checking whether Codex has published the final report..."
          : generatedReportAvailable
            ? "Final report found. Fetch it into this company record."
            : "Export the rich packet first. If Codex gives you a report file before deployment, use Import Final Report as the fallback.";
      return (
        <div className="report-stack">
          <section className="panel report-hero">
            <div>
              <span className="eyebrow">Final stock report</span>
              <h2>{reportLoaded ? "Institutional report ready" : generatedReportAvailable ? "Generated report ready to fetch" : "Export evidence packet for Codex"}</h2>
              <p>Use this page to move from collected evidence to a clean stock-only research report and PDF.</p>
            </div>
            <div className="toolbar">
              <button className="secondary" onClick={exportCodexResearchPacket}>
                <Download size={17} /> Export Rich Packet
              </button>
              <label className="secondary file-label">
                <Upload size={17} /> Import Final Report
                <input type="file" accept=".txt,.md,.json" onChange={importCodexReport} />
              </label>
              <button className="secondary" onClick={() => fetchGeneratedReport()} disabled={!canFetchReport}>
                <FileText size={17} /> {reportFetching ? "Fetching" : "Fetch Generated Report"}
              </button>
              <button className="secondary" onClick={exportSelectedReportPdf} disabled={!reportLoaded}>
                <FileDown size={17} /> Export PDF
              </button>
            </div>
            <div className="info">{reportActionStatus}</div>
            {packetBridgeMessage ? <div className="info">{packetBridgeMessage}</div> : null}
          </section>

          <div className="stats compact-stats report-stats">
            <Stat label="Evidence packet" value={fundamentalsRecord || trendlyneIntel ? "Ready" : "Needs sync"} />
            <Stat label="Final reports" value={finalReportCount} />
            <Stat label="PDF export" value={reportLoaded ? "Ready" : generatedReportAvailable ? "Fetch first" : "Locked"} />
            <Stat label="Report style" value="Stock only" />
          </div>

          <div className="grid-3 workflow-grid compact-flow">
            <article className="panel">
              <span className="eyebrow">Step 1</span>
              <h3>Sync evidence</h3>
              <p>Use Data Hub for company fundamentals, shareholding, market data and filing evidence.</p>
            </article>
            <article className="panel">
              <span className="eyebrow">Step 2</span>
              <h3>Export packet</h3>
              <p>With the local bridge running, export also stages the packet for Codex automatically.</p>
            </article>
            <article className="panel">
              <span className="eyebrow">Step 3</span>
              <h3>Import report</h3>
              <p>The final report shown below should discuss only the stock, not the data pipeline.</p>
            </article>
          </div>

          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">Reader-facing output</span>
                <h2>Final stock research report</h2>
              </div>
            </div>
            {reportText.trim() ? (
              <textarea className="report-output" value={reportText} onChange={(event) => updateSelected({ aiOutput: event.target.value })} />
            ) : (
              <div className="info">No final report imported yet. Export the evidence packet, stage it for Codex, then fetch or import the published report here.</div>
            )}
          </section>

        </div>
      );
    }

    if (activeTab === "documents") {
      return (
        <section className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Source library</span>
              <h2>Documents</h2>
            </div>
            <button
              onClick={() =>
                updateSelected({
                  documents: [{ name: "", type: "Annual Report", status: "To Review" }, ...company.documents]
                })
              }
            >
              <Plus size={17} /> Document
            </button>
          </div>
          <div className="stack">
            {company.documents.map((document, index) => (
              <div className="doc-card" key={index}>
                <div>
                  <input
                    placeholder="Document name"
                    value={document.name}
                    onChange={(event) => updateDocument(index, { ...document, name: event.target.value })}
                  />
                  <small>
                    {document.type} - {document.status}
                  </small>
                </div>
                <div className="toolbar">
                  <select value={document.type} onChange={(event) => updateDocument(index, { ...document, type: event.target.value })}>
                    {["Annual Report", "Concall", "Investor Presentation", "Credit Rating", "Exchange Filing", "Other"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <select value={document.status} onChange={(event) => updateDocument(index, { ...document, status: event.target.value })}>
                    {["To Review", "Reviewed", "Key Source"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <button className="danger" onClick={() => removeDocument(index)}>
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return null;
  }

  function updateDocument(index: number, value: Company["documents"][number]) {
    if (!selected) return;
    saveCompany({ ...selected, documents: selected.documents.map((item, itemIndex) => (itemIndex === index ? value : item)) });
  }

  function removeDocument(index: number) {
    if (!selected) return;
    saveCompany({ ...selected, documents: selected.documents.filter((_, itemIndex) => itemIndex !== index) });
  }

  const navItems: Array<[PageId, string, React.ReactNode]> = [
    ["dashboard", "Hub", <BarChart3 size={16} key="dashboard" />],
    ["search", "Find", <Search size={16} key="search" />],
    ["fundamentals", "Data", <FileText size={16} key="fundamentals" />],
    ["research", "Report", <FlaskConical size={16} key="research" />]
  ];

  if (!hydrated) {
    return (
      <main className="shell">
        <div className="topbar">
          <div className="brand">
            <div className="brandmark">I</div>
            <div>
              <strong>IMRS Enterprise</strong>
              <small>Data-to-Report OS</small>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brandmark">I</div>
          <div>
            <strong>IMRS Enterprise</strong>
            <small>Data-to-Report OS</small>
          </div>
        </div>
        <div className="top-actions">
          <button onClick={createCompany} title="Create company">
            <Plus size={17} /> Company
          </button>
        </div>
      </header>

      <div className="app">
        <aside className="sidebar">
          <input
            value={sideQuery}
            onChange={(event) => setSideQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && sideQuery.trim()) {
                setSearchQuery(sideQuery);
                setActivePage("search");
              }
            }}
            placeholder="Search saved companies"
          />
          <div className="nav">
            {navItems.map(([id, label, icon]) => (
              <button className={activePage === id ? "active" : ""} onClick={() => setActivePage(id)} key={id}>
                {icon}
                {label}
              </button>
            ))}
          </div>
          <div className="side-title">Companies</div>
          <div className="mini">
            {filteredMini.map((company) => (
              <button className={selectedId === company.id ? "active" : ""} onClick={() => openCompany(company.id)} key={company.id}>
                <strong>{company.name}</strong>
                <small>
                  {company.ticker || "No ticker"} - {company.status}
                </small>
              </button>
            ))}
          </div>
        </aside>

        <section className="content">
          {activePage === "dashboard" ? renderDashboard() : null}
          {activePage === "search" ? renderSearch() : null}
          {activePage === "fundamentals" ? renderFundamentals() : null}
          {activePage === "research" ? renderResearch() : null}
        </section>
      </div>
    </main>
  );
}

function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <p>{children}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CompanyTable({ companies, openCompany }: { companies: Company[]; openCompany: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Ticker</th>
            <th>Evidence</th>
            <th>Report</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr onClick={() => openCompany(company.id)} key={company.id}>
              <td>
                <strong>{company.name}</strong>
                <small>{company.sector || company.status}</small>
              </td>
              <td>{company.ticker || "-"}</td>
              <td>
                <span className="pill">{company.dataSource ? "Collected" : "Manual"}</span>
              </td>
              <td>
                <span className="pill">{company.codexReports?.length ? "Ready" : "Pending"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextCard({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void }) {
  return (
    <article className="panel">
      <h3>{title}</h3>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </article>
  );
}
