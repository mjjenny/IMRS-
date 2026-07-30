"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  Database,
  Download,
  FileDown,
  FileText,
  FlaskConical,
  Gauge,
  KeyRound,
  NotebookText,
  Plus,
  Search,
  Upload,
  Users
} from "lucide-react";
import { strFromU8, unzipSync } from "fflate";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

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

type ScoreKey = keyof Scores;

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

type Company = {
  id: string;
  name: string;
  ticker: string;
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

type KiteStatus = {
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
  connected: boolean;
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

type CompanySearchResult = {
  name: string;
  ticker: string;
  exchange: string;
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

type PageId = "dashboard" | "search" | "screener" | "watchlist" | "portfolio" | "committee" | "research" | "kite" | "fundamentals";
type TabId =
  | "overview"
  | "financials"
  | "scorecard"
  | "report"
  | "thesis"
  | "risks"
  | "catalysts"
  | "documents"
  | "ai"
  | "reviews"
  | "valuation";

const scoreLabels: Record<ScoreKey, string> = {
  businessQuality: "Business quality",
  managementQuality: "Management quality",
  financialStrength: "Financial strength",
  growthRunway: "Growth runway",
  moat: "Competitive moat",
  governance: "Governance",
  valuation: "Valuation attractiveness",
  cashFlowQuality: "Cash-flow quality",
  industryTailwinds: "Industry tailwinds",
  riskReward: "Risk-reward"
};

const tabs: Array<[TabId, string]> = [
  ["overview", "Overview"],
  ["financials", "Financials"],
  ["scorecard", "Scorecard"],
  ["report", "Report"],
  ["thesis", "Thesis"],
  ["risks", "Risks"],
  ["catalysts", "Catalysts"],
  ["documents", "Documents"],
  ["ai", "AI Analysis"],
  ["reviews", "Quarterly Reviews"],
  ["valuation", "Valuation"]
];

const starterCompanies: CompanySearchResult[] = [
  {
    name: "Central Depository Services (India) Ltd",
    ticker: "CDSL",
    exchange: "NSE",
    sector: "Capital Markets",
    marketCap: "33900",
    currentPrice: "1620",
    pe: "62",
    roe: "29",
    roce: "38",
    salesGrowth: "31",
    profitGrowth: "35",
    debtEquity: "0",
    promoterHolding: "15",
    note: "Depository infrastructure and capital-market participation play."
  },
  {
    name: "Dixon Technologies (India) Ltd",
    ticker: "DIXON",
    exchange: "NSE",
    sector: "Electronics Manufacturing Services",
    marketCap: "84000",
    currentPrice: "13900",
    pe: "108",
    roe: "23",
    roce: "28",
    salesGrowth: "36",
    profitGrowth: "42",
    debtEquity: "0.25",
    promoterHolding: "33",
    note: "EMS scale, import substitution and manufacturing outsourcing theme."
  },
  {
    name: "Hindustan Aeronautics Ltd",
    ticker: "HAL",
    exchange: "NSE",
    sector: "Defence Aerospace",
    marketCap: "330000",
    currentPrice: "4930",
    pe: "40",
    roe: "27",
    roce: "34",
    salesGrowth: "15",
    profitGrowth: "26",
    debtEquity: "0",
    promoterHolding: "71",
    note: "Defence order book and domestic aerospace capability compounder."
  },
  {
    name: "Trent Ltd",
    ticker: "TRENT",
    exchange: "NSE",
    sector: "Retail",
    marketCap: "195000",
    currentPrice: "5480",
    pe: "135",
    roe: "27",
    roce: "31",
    salesGrowth: "48",
    profitGrowth: "72",
    debtEquity: "0.32",
    promoterHolding: "37",
    note: "Retail format execution, Zudio growth and operating leverage story."
  },
  {
    name: "Kaynes Technology India Ltd",
    ticker: "KAYNES",
    exchange: "NSE",
    sector: "Electronics Manufacturing Services",
    marketCap: "36000",
    currentPrice: "5650",
    pe: "95",
    roe: "16",
    roce: "19",
    salesGrowth: "55",
    profitGrowth: "65",
    debtEquity: "0.1",
    promoterHolding: "57",
    note: "High-growth EMS and industrial electronics platform."
  },
  {
    name: "KPIT Technologies Ltd",
    ticker: "KPITTECH",
    exchange: "NSE",
    sector: "Auto Software",
    marketCap: "40000",
    currentPrice: "1460",
    pe: "55",
    roe: "27",
    roce: "33",
    salesGrowth: "32",
    profitGrowth: "41",
    debtEquity: "0",
    promoterHolding: "40",
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
    documents: raw.documents || []
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

function score(company: Company) {
  const values = Object.values(company.scores).map(Number);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10);
}

function verdict(company: Company) {
  const result = score(company);
  if (result >= 80) return "High-conviction candidate. Complete valuation and forensic verification.";
  if (result >= 70) return "Promising candidate. Deepen research before position sizing.";
  if (result >= 60) return "Watchlist quality. Key weaknesses must improve.";
  return "Low-conviction. Avoid until evidence changes.";
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function highRiskCount(company: Company) {
  return company.risks.filter((risk) => risk.impact === "High" || risk.probability === "High").length;
}

function investmentDiagnostics(company: Company) {
  const f = company.financials;
  const conviction = score(company);
  const roe = asNumber(f.roe);
  const roce = asNumber(f.roce);
  const pe = asNumber(f.pe);
  const profitGrowth = asNumber(f.profitGrowth);
  const salesGrowth = asNumber(f.salesGrowth);
  const debt = asNumber(f.debtEquity);
  const dvmMomentum = asNumber(f.dvmMomentum);
  const dvmValuation = asNumber(f.dvmValuation);
  const weakReturns = (roe > 0 && roe < 12) || (roce > 0 && roce < 12);
  const negativeProfit = profitGrowth < 0;
  const expensive = pe > 45 || (dvmValuation > 0 && dvmValuation < 45);
  const weakMomentum = dvmMomentum > 0 && dvmMomentum < 45;
  const severeRisks = highRiskCount(company);

  const multibaggerProbability = clampPercent(
    conviction * 0.48 +
      company.scores.growthRunway * 3.2 +
      company.scores.businessQuality * 2.2 +
      company.scores.financialStrength * 1.6 +
      (salesGrowth >= 20 ? 7 : salesGrowth >= 10 ? 3 : 0) +
      (profitGrowth >= 20 ? 7 : negativeProfit ? -14 : 0) +
      (debt > 0 && debt <= 0.5 ? 4 : debt > 1 ? -8 : 0) -
      (expensive ? 7 : 0) -
      (weakReturns ? 10 : 0) -
      severeRisks * 4
  );

  const trapProbability = clampPercent(
    100 -
      conviction * 0.52 +
      (negativeProfit ? 18 : 0) +
      (weakReturns ? 16 : 0) +
      (expensive ? 11 : 0) +
      (weakMomentum ? 8 : 0) +
      severeRisks * 7 -
      (salesGrowth >= 20 && profitGrowth >= 15 ? 8 : 0) -
      (debt > 0 && debt <= 0.5 ? 5 : 0)
  );

  const finalVerdict =
    trapProbability >= 60
      ? "Potential trap. Do not upgrade unless fundamentals and price discipline improve."
      : multibaggerProbability >= 70 && trapProbability < 40
        ? "High-potential candidate. Move to full diligence and valuation work."
        : multibaggerProbability >= 55
          ? "Promising but unproven. Keep on active watchlist and verify the thesis."
          : "Research watchlist only. Evidence is not strong enough for multibagger status.";

  return {
    multibaggerProbability,
    trapProbability,
    finalVerdict,
    weakReturns,
    negativeProfit,
    expensive,
    weakMomentum,
    severeRisks
  };
}

function impliedPrice(scenario: ValuationCase) {
  return asNumber(scenario.eps) * asNumber(scenario.pe);
}

function weightedExpectedPrice(company: Company) {
  return (["bear", "base", "bull"] as const).reduce((sum, key) => {
    const scenario = company.valuation[key];
    return sum + impliedPrice(scenario) * (asNumber(scenario.probability) / 100);
  }, 0);
}

function getReportBullets(company: Company) {
  const f = company.financials;
  const diagnostics = investmentDiagnostics(company);
  const fiveTen =
    diagnostics.multibaggerProbability >= 65
      ? [
          `Sales and earnings need to compound above ${metric(f.salesGrowth || "20", "%")} without cash-flow deterioration.`,
          `ROCE/ROE should remain or move above 18-20%, with reinvestment opportunities still available.`,
          "Valuation must stay disciplined enough that earnings growth, not only multiple expansion, drives returns."
        ]
      : [
          "Growth must accelerate materially and prove it is structural rather than one-off.",
          "ROE/ROCE and cash conversion need to improve before this can qualify as a serious 5x/10x candidate.",
          "The company needs a clearer moat, stronger execution evidence and a valuation that leaves room for upside."
        ];
  const fail =
    diagnostics.trapProbability >= 55
      ? [
          "Profit growth remains weak or negative while valuation stays elevated.",
          "ROE/ROCE fail to recover, suggesting the business is not earning enough on capital.",
          "Trendlyne/NSE evidence points to governance, insider, cash-flow or ownership deterioration."
        ]
      : [
          "Two or more quarters miss the core growth or margin assumptions.",
          "Operating cash flow fails to follow reported earnings.",
          "A new governance, promoter, auditor, pledge or customer-concentration concern appears."
        ];

  return { fiveTen, fail };
}

function buildInvestmentReportText(company: Company) {
  const f = company.financials;
  const diagnostics = investmentDiagnostics(company);
  const bullets = getReportBullets(company);
  const weighted = weightedExpectedPrice(company);
  const risks = company.risks.slice(0, 5).map((risk) => `- ${risk.title}: ${risk.probability}/${risk.impact}. ${risk.mitigation}`).join("\n");
  const catalysts = company.catalysts.slice(0, 5).map((catalyst) => `- ${catalyst.title}: ${catalyst.status}. ${catalyst.notes}`).join("\n");

  return `IMRS Stock Research Report - ${company.name}

Executive verdict:
${diagnostics.finalVerdict}

Conviction score: ${score(company)}/100
Multibagger probability: ${diagnostics.multibaggerProbability}/100
Trap probability: ${diagnostics.trapProbability}/100

Business quality:
${company.businessSummary || "Not enough business-quality evidence has been entered yet."}

Financial quality:
Revenue INR ${f.revenue || "-"} crore; net profit INR ${f.profit || "-"} crore; EPS INR ${f.eps || "-"}; P/E ${f.pe || "-"}; ROE ${
    f.roe || "-"
  }%; ROCE ${f.roce || "-"}%; debt/equity ${f.debtEquity || "-"}; OPM ${f.opm || "-"}%; CFO ${f.cfo || "-"}.

Valuation:
Bear/base/bull implied prices are INR ${Math.round(impliedPrice(company.valuation.bear)).toLocaleString("en-IN")}, INR ${Math.round(
    impliedPrice(company.valuation.base)
  ).toLocaleString("en-IN")} and INR ${Math.round(impliedPrice(company.valuation.bull)).toLocaleString(
    "en-IN"
  )}. Probability-weighted expected price is INR ${Math.round(weighted).toLocaleString("en-IN")}. This is a scenario output, not a guaranteed target.

Growth runway:
${company.industryOpportunity || company.multibaggerCase || "Growth runway still needs evidence from filings, industry data and management commentary."}

Ownership:
Promoter ${f.promoterHolding || "-"}%; FII ${f.fiiHolding || "-"}%; DII ${f.diiHolding || "-"}%; institutional ${
    f.institutionalHolding || "-"
  }%.

Key risks:
${risks || company.bearThesis || "No risk register has been built yet."}

Catalysts:
${catalysts || "No catalysts have been recorded yet."}

What must happen for 5x/10x:
${bullets.fiveTen.map((item) => `- ${item}`).join("\n")}

What would make this fail:
${bullets.fail.map((item) => `- ${item}`).join("\n")}

Final recommendation:
${diagnostics.finalVerdict}

Required next diligence:
- Verify all figures against primary filings.
- Review latest annual report, quarterly results and concall commentary.
- Compare valuation, ROE/ROCE and growth against direct peers.
- Treat this as research support, not financial advice.`;
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

function buildPrintableReportHtml(company: Company, trendlyneIntel?: TrendlyneIntelligenceRecord) {
  const f = company.financials;
  const diagnostics = investmentDiagnostics(company);
  const bullets = getReportBullets(company);
  const generatedAt = new Date().toLocaleString("en-IN");
  const reportText = company.aiOutput || buildInvestmentReportText(company);
  const valuationRows: Array<[string, string]> = (["bear", "base", "bull"] as const).map((caseName) => {
    const scenario = company.valuation[caseName];
    return [
      `${caseName.toUpperCase()} case`,
      `EPS CAGR ${scenario.revenueGrowth || "-"}%; Future EPS INR ${scenario.eps || "-"}; Exit P/E ${
        scenario.pe || "-"
      }; Probability ${scenario.probability || "-"}%; Implied price INR ${Math.round(impliedPrice(scenario)).toLocaleString("en-IN")}`
    ];
  });

  const scoreRows = (Object.entries(scoreLabels) as Array<[ScoreKey, string]>).map(
    ([key, label]) => [label, `${company.scores[key]}/10`] as [string, string]
  );

  const trendlyneSections = trendlyneIntel
    ? [
        ["Overview and DVM", trendlyneIntel.overview],
        ["Technicals", trendlyneIntel.technical],
        ["News and announcements", trendlyneIntel.news],
        ["Corporate events", trendlyneIntel.events],
        ["Ownership", trendlyneIntel.shareholding],
        ["Insider / SAST", trendlyneIntel.sast],
        ["Bulk and block deals", trendlyneIntel.bulkBlock],
        ["Document search", trendlyneIntel.documents]
      ]
        .map(([title, value]) => printableSection(`Trendlyne - ${title}`, `<p>${nl2br(cleanTrendlyneIntel(title, value))}</p>`))
        .join("")
    : printableSection("Trendlyne intelligence", "<p>No Trendlyne intelligence pack is saved for this company yet.</p>");

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
    h3 { margin: 0 0 8px; font-size: 15px; }
    p { margin: 0 0 10px; }
    section { break-inside: avoid; border: 1px solid #d7e1dc; border-radius: 8px; padding: 14px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-top: 1px solid #d7e1dc; padding: 8px; vertical-align: top; text-align: left; }
    th { width: 34%; color: #667670; font-size: 12px; text-transform: uppercase; }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li { margin-bottom: 5px; }
    .meta { color: #667670; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
    .stat { border: 1px solid #d7e1dc; border-radius: 8px; padding: 12px; }
    .stat span { display: block; color: #667670; font-size: 12px; }
    .stat strong { display: block; margin-top: 6px; font-size: 22px; }
    .memo { white-space: pre-wrap; }
    .disclaimer { color: #667670; font-size: 12px; }
    @media print {
      button { display: none; }
      .grid { grid-template-columns: repeat(4, 1fr); }
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
    <div class="stat"><span>Conviction</span><strong>${score(company)}/100</strong></div>
    <div class="stat"><span>Multibagger probability</span><strong>${diagnostics.multibaggerProbability}/100</strong></div>
    <div class="stat"><span>Trap probability</span><strong>${diagnostics.trapProbability}/100</strong></div>
    <div class="stat"><span>Weighted scenario price</span><strong>INR ${Math.round(weightedExpectedPrice(company)).toLocaleString("en-IN")}</strong></div>
  </div>

  ${printableSection("Executive verdict", `<p>${escapeHtml(diagnostics.finalVerdict)}</p>`)}
  ${printableSection("AI / analyst report", `<div class="memo">${nl2br(reportText)}</div>`)}
  ${printableSection(
    "Financials",
    printableTable([
      ["Revenue INR crore", f.revenue],
      ["Net profit INR crore", f.profit],
      ["EPS INR", f.eps],
      ["P/E", f.pe],
      ["ROE %", f.roe],
      ["ROCE %", f.roce],
      ["Debt/Equity", f.debtEquity],
      ["Sales growth %", f.salesGrowth],
      ["Profit growth %", f.profitGrowth],
      ["Operating margin %", f.opm],
      ["Operating cash flow INR crore", f.cfo],
      ["Current price INR", f.currentPrice],
      ["DVM durability", f.dvmDurability],
      ["DVM valuation", f.dvmValuation],
      ["DVM momentum", f.dvmMomentum],
      ["Analyst score", f.analystScore]
    ])
  )}
  ${printableSection(
    "Ownership",
    printableTable([
      ["Promoter holding %", f.promoterHolding],
      ["FII holding %", f.fiiHolding],
      ["DII holding %", f.diiHolding],
      ["Institutional holding %", f.institutionalHolding]
    ])
  )}
  ${printableSection("Scorecard", printableTable(scoreRows))}
  ${printableSection("Valuation scenarios", printableTable([...valuationRows, ["Probability-weighted expected price", `INR ${Math.round(weightedExpectedPrice(company)).toLocaleString("en-IN")}`]]))}
  ${printableSection("Business quality", `<p>${nl2br(company.businessSummary || "Not entered.")}</p>`)}
  ${printableSection("Growth runway and multibagger case", `<p>${nl2br(company.industryOpportunity || company.multibaggerCase || "Not entered.")}</p>`)}
  ${printableSection("Management assessment", `<p>${nl2br(company.managementAssessment || "Not entered.")}</p>`)}
  ${printableSection("Bull thesis", `<p>${nl2br(company.bullThesis || "Not entered.")}</p>`)}
  ${printableSection("Bear thesis", `<p>${nl2br(company.bearThesis || "Not entered.")}</p>`)}
  ${printableSection("Key assumptions", `<p>${nl2br(company.keyAssumptions || "Not entered.")}</p>`)}
  ${printableSection("Thesis killers", `<p>${nl2br(company.thesisKillers || "Not entered.")}</p>`)}
  ${printableSection("What must happen for 5x/10x", printableList(bullets.fiveTen))}
  ${printableSection("What would make this fail", printableList(bullets.fail))}
  ${printableSection(
    "Risk register",
    company.risks.length
      ? printableTable(company.risks.map((risk) => [risk.title, `${risk.probability}/${risk.impact}. ${risk.mitigation}`]))
      : "<p>No risks recorded.</p>"
  )}
  ${printableSection(
    "Catalysts",
    company.catalysts.length
      ? printableTable(company.catalysts.map((catalyst) => [catalyst.title, `${catalyst.status}; ${catalyst.date || "No date"}. ${catalyst.notes}`]))
      : "<p>No catalysts recorded.</p>"
  )}
  ${printableSection(
    "Documents",
    company.documents.length ? printableTable(company.documents.map((document) => [document.name, `${document.type}; ${document.status}`])) : "<p>No documents recorded.</p>"
  )}
  ${printableSection(
    "Quarterly reviews",
    company.reviews.length ? printableTable(company.reviews.map((review) => [review.quarter, `${review.verdict}. ${review.notes}`])) : "<p>No reviews recorded.</p>"
  )}
  ${trendlyneSections}
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

function stripRawTrendlyneText(value: string) {
  return looksLikeRawTrendlyneText(value) ? "" : value;
}

function shouldReplaceGeneratedItem(value: string) {
  return looksLikeRawTrendlyneText(value) || /trendlyne|growth delivery watch|momentum recovery trigger|negative profit growth|weak capital efficiency|valuation risk/i.test(value);
}

function metric(value: string, suffix = "") {
  return value ? `${value}${suffix}` : "-";
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
  const overview = hasMeaningfulText(overviewText)
    ? compactText(overviewText, 420)
    : `${record.companyName || company.name} is classified under ${company.sector || "the imported Trendlyne/NSE universe"}.`;

  return `${overview}

Evidence snapshot: market cap INR ${metric(record.marketCap || company.marketCap, " cr")}; P/E ${metric(record.pe)}; ROE ${metric(
    record.roe,
    "%"
  )}; ROCE ${metric(record.roce, "%")}; Debt/Equity ${metric(record.debtEquity)}; promoter holding ${metric(
    record.promoterHolding,
    "%"
  )}.`;
}

function buildIndustryOpportunity(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const sectorLine = company.sector ? `${company.sector} sector exposure needs to be tested for industry growth, regulation, cyclicality and competition.` : "";
  const recentEvidence = compactText(
    [cleanTrendlyneIntel("News and announcements", intelligence.news), cleanTrendlyneIntel("Corporate events", intelligence.events)]
      .filter(hasMeaningfulText)
      .join("\n\n"),
    420
  );
  return `${sectorLine || "Industry context should be verified from sector sources and company filings."}

Trendlyne signal: sales growth is ${growthLabel(record.salesGrowth)} at ${metric(record.salesGrowth, "%")}; DVM momentum is ${metric(
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

Trendlyne ownership evidence:
${sast}`;
}

function buildMultibaggerCase(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const positives = [
    Number(record.salesGrowth) >= 15 ? `sales growth is healthy at ${record.salesGrowth}%` : "",
    Number(record.roce) >= 15 ? `ROCE is acceptable/strong at ${record.roce}%` : "",
    Number(record.debtEquity) <= 0.5 && record.debtEquity ? `balance sheet leverage is controlled at ${record.debtEquity} debt/equity` : "",
    Number(record.promoterHolding) >= 45 ? `promoter holding is meaningful at ${record.promoterHolding}%` : "",
    Number(record.dvmDurability) >= 60 ? `Trendlyne durability score is supportive at ${record.dvmDurability}` : "",
    hasMeaningfulText(intelligence.news) ? "recent news flow provides items to investigate as possible catalysts" : ""
  ].filter(Boolean);

  return `${record.companyName || company.name} can be treated as a possible multibagger candidate only if the business can compound earnings for several years without serious governance or balance-sheet deterioration.

Current supporting evidence:
${positives.length ? positives.map((item) => `- ${item}`).join("\n") : "- Trendlyne data does not yet show enough high-quality multibagger evidence."}

What must be proven next: large growth runway, durable moat, improving ROCE/ROE, cash conversion, reinvestment opportunity, management execution and valuation discipline.`;
}

function buildBullThesis(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const catalystText = [cleanTrendlyneIntel("News and announcements", intelligence.news), cleanTrendlyneIntel("Corporate events", intelligence.events)]
    .filter(hasMeaningfulText)
    .join("\n\n");
  return `Bull case: ${record.companyName || company.name} becomes attractive if revenue growth remains ${growthLabel(record.salesGrowth)}, profitability recovers or improves, capital efficiency rises, and the market gains confidence in the durability of earnings.

Evidence to support the upside case:
- Sales growth: ${metric(record.salesGrowth, "%")}.
- Profit growth: ${metric(record.profitGrowth, "%")}.
- ROE/ROCE: ${metric(record.roe, "%")} / ${metric(record.roce, "%")}.
- DVM durability/valuation/momentum: ${metric(record.dvmDurability)} / ${metric(record.dvmValuation)} / ${metric(record.dvmMomentum)}.

Catalyst watch:
${compactText(catalystText, 380) || "Track quarterly results, management commentary, order wins, margin recovery and institutional ownership changes."}`;
}

function buildBearThesis(record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const concerns = [
    Number(record.profitGrowth) < 0 ? `profit growth is negative at ${record.profitGrowth}%` : "",
    Number(record.roce) > 0 && Number(record.roce) < 12 ? `ROCE is modest at ${record.roce}%` : "",
    Number(record.roe) > 0 && Number(record.roe) < 12 ? `ROE is modest at ${record.roe}%` : "",
    Number(record.pe) > 35 ? `valuation may already price in optimism at ${record.pe}x earnings` : "",
    Number(record.dvmMomentum) > 0 && Number(record.dvmMomentum) < 45 ? `Trendlyne momentum is weak at ${record.dvmMomentum}` : "",
    /sell|disposal|pledge|sast|insider/i.test(intelligence.sast) ? "insider/SAST activity needs forensic review" : ""
  ].filter(Boolean);

  return `Bear case: the stock may become a value trap or momentum trap if growth slows, margins compress, ROCE/ROE remain weak, or valuation is high relative to actual earnings delivery.

Current concerns:
${concerns.length ? concerns.map((item) => `- ${item}`).join("\n") : "- No single fatal concern was detected from the available Trendlyne snapshot, but primary filings still need review."}

Trap test: avoid treating a popular name as a multibagger unless cash flow, capital allocation, governance and valuation all support the story.`;
}

function buildKeyAssumptions(record: FundamentalsRecord) {
  return `Key assumptions to verify:
- Sales can compound at or above ${metric(record.salesGrowth, "%")} without excessive working-capital stress.
- Profit growth improves from ${metric(record.profitGrowth, "%")} and is not driven only by one-off items.
- ROE and ROCE improve from ${metric(record.roe, "%")} / ${metric(record.roce, "%")}.
- Debt/equity remains controlled near ${metric(record.debtEquity)}.
- Promoter and institutional ownership remain stable.
- Current valuation of ${metric(record.pe)}x earnings leaves enough upside for execution risk.`;
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
- Primary filings contradict the Trendlyne/NSE data used in this draft.${hasMeaningfulText(sastText) ? `\n\nOwnership/SAST evidence to monitor:\n${compactText(sastText, 260)}` : ""}`;
}

function buildAnalystPrompt(company: Company) {
  return `Act as an institutional equity research analyst. Using the source-backed data already saved in IMRS for ${company.name}, produce a balanced investment memo covering business quality, industry runway, management, financial strength, valuation, catalysts, risks, multibagger potential and potential trap warnings. Separate facts from assumptions and do not give a buy/sell recommendation unless the evidence is sufficient.`;
}

function buildValuationCases(company: Company, record: FundamentalsRecord) {
  const currentPrice = asNumber(record.currentPrice) || asNumber(company.financials.currentPrice);
  const currentPe = asNumber(record.pe) || asNumber(company.financials.pe);
  const reportedEps = asNumber(record.eps) || asNumber(company.financials.eps);
  const marketImpliedEps = currentPrice && currentPe ? currentPrice / currentPe : 0;
  const epsMismatch =
    Boolean(marketImpliedEps && reportedEps) && Math.abs(reportedEps - marketImpliedEps) / marketImpliedEps > 0.35;
  const currentEps = epsMismatch ? marketImpliedEps : reportedEps || marketImpliedEps;
  const salesGrowth = asNumber(record.salesGrowth) || asNumber(company.financials.salesGrowth) || 10;
  const profitGrowth = asNumber(record.profitGrowth) || asNumber(company.financials.profitGrowth) || salesGrowth;
  const roe = asNumber(record.roe) || asNumber(company.financials.roe);
  const roce = asNumber(record.roce) || asNumber(company.financials.roce);
  const dvmMomentum = asNumber(record.dvmMomentum) || asNumber(company.financials.dvmMomentum);
  const dvmValuation = asNumber(record.dvmValuation) || asNumber(company.financials.dvmValuation);
  const weakQuality = (roe > 0 && roe < 12) || (roce > 0 && roce < 12);
  const negativeProfit = profitGrowth < 0;
  const weakMomentum = dvmMomentum > 0 && dvmMomentum < 45;
  const valuationNotCheap = dvmValuation > 0 && dvmValuation < 55;
  const growthPenalty = [negativeProfit, weakQuality, weakMomentum].filter(Boolean).length;
  const baseGrowth = negativeProfit ? Math.max(-5, Math.min(6, salesGrowth / 5)) : Math.max(0, Math.min(14, profitGrowth || salesGrowth / 2));
  const bearGrowth = Math.max(-10, Math.min(baseGrowth - 5, negativeProfit ? -5 : salesGrowth / 3));
  const bullGrowthCap = growthPenalty >= 2 ? 10 : growthPenalty === 1 ? 14 : 18;
  const bullGrowth = Math.max(baseGrowth + 3, Math.min(bullGrowthCap, Math.max(salesGrowth / 2, profitGrowth) + 3));
  const basePe = currentPe || 20;
  const bearPe = Math.max(8, Math.round(basePe * (valuationNotCheap ? 0.55 : 0.65)));
  const baseExitPe = Math.max(8, Math.round(basePe * (valuationNotCheap ? 0.85 : 1)));
  const bullPe = Math.min(35, Math.round(basePe * (valuationNotCheap || weakQuality ? 1 : 1.1)));
  const projectEps = (growth: number) => (currentEps ? formatNumber(currentEps * Math.pow(1 + growth / 100, 5)) : "");

  return {
    bear: { revenueGrowth: formatNumber(bearGrowth, 1), eps: projectEps(bearGrowth), pe: String(bearPe), probability: "30" },
    base: { revenueGrowth: formatNumber(baseGrowth, 1), eps: projectEps(baseGrowth), pe: String(baseExitPe), probability: "50" },
    bull: { revenueGrowth: formatNumber(bullGrowth, 1), eps: projectEps(bullGrowth), pe: String(bullPe), probability: "20" }
  };
}

function buildResearchReview(record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  return {
    quarter: new Date(record.importedAt || intelligence.importedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    verdict: "Unchanged",
    notes: `Trendlyne/NSE sync created a first-pass research draft. Verify annual report, latest quarterly results, concall commentary, cash flow and governance before changing position size.`
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

function extractTableRows(text: string, maxRows = 5) {
  return Array.from(text.matchAll(/\[([^\[\]\n]+)\]/g))
    .map((match) => match[1].split(",").map((part) => part.replace(/^"|"$/g, "").trim()))
    .filter((parts) => parts.length >= 4 && !parts[0].includes("Quarter") && !parts[0].includes("Type"))
    .slice(0, maxRows)
    .map((parts) => parts.filter(Boolean).slice(0, 7).join(" | "));
}

function cleanTrendlyneIntel(title: string, value: string) {
  if (!hasMeaningfulText(value)) return "No useful Trendlyne data returned for this section.";
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
    if (/isCurtail:\s*True/i.test(value)) lines.push("Trendlyne returned a curtailed list; review the source for the complete table.");
    if (rows.length) lines.push("Recent transactions:", ...rows.map((item) => `- ${item}`));
  } else if (lowerTitle.includes("document")) {
    lines.push(...value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 10));
  }

  const clean = lines.join("\n").trim();
  if (clean) return clean;
  if (looksLikeRawTrendlyneText(value)) {
    return "Trendlyne returned structured table data for this section. No clean summary rows were extracted; review the source table before using it in the thesis.";
  }
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.includes(" | ") && !/headers?:|tableData:|stockData:/i.test(line))
    .slice(0, 18)
    .join("\n")
    .trim() || compactText(value, 900);
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

function trendlyneResearchBrief(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
  const cleanOverview = cleanTrendlyneIntel("Overview and DVM", intelligence.overview);
  const cleanTechnical = cleanTrendlyneIntel("Technicals", intelligence.technical);
  const cleanNews = cleanTrendlyneIntel("News and announcements", intelligence.news);
  const cleanEvents = cleanTrendlyneIntel("Corporate events", intelligence.events);
  const cleanOwnership = cleanTrendlyneIntel("Ownership", intelligence.shareholding);
  const cleanSast = cleanTrendlyneIntel("Insider / SAST", intelligence.sast);
  const cleanDeals = cleanTrendlyneIntel("Bulk and block deals", intelligence.bulkBlock);
  const cleanDocuments = cleanTrendlyneIntel("Document search", intelligence.documents);

  return `IMRS Institutional Research Draft - ${record.companyName || company.name}

Source:
Trendlyne MCP, synced ${new Date(intelligence.importedAt).toLocaleString()} via ${intelligence.transport}.

1. Executive view
Current IMRS verdict: ${verdict(company)}

This is an evidence-backed first draft, not a final investment recommendation. Treat the company as a candidate for deeper work only after verifying filings, annual reports, concalls, cash flow and governance.

2. Financial and ownership snapshot
Market cap INR ${record.marketCap || company.marketCap || "-"} cr; P/E ${record.pe || "-"}; ROE ${record.roe || "-"}%; ROCE ${
    record.roce || "-"
  }%; Debt/Equity ${record.debtEquity || "-"}; Sales growth ${record.salesGrowth || "-"}%; Profit growth ${
    record.profitGrowth || "-"
  }%; OPM ${record.opm || "-"}%; Cash-flow metric ${record.cfo || "-"}.

Ownership:
Promoter ${record.promoterHolding || "-"}%; FII ${record.fiiHolding || "-"}%; DII ${record.diiHolding || "-"}%; Institutional ${
    record.institutionalHolding || "-"
  }%.

3. DVM signal
Durability ${record.dvmDurability || "-"}; Valuation ${record.dvmValuation || "-"}; Momentum ${record.dvmMomentum || "-"}.

4. Multibagger potential
${buildMultibaggerCase(company, record, intelligence)}

5. Potential trap warning
${buildBearThesis(record, intelligence)}

6. Business quality
${buildBusinessSummary(company, record, intelligence)}

Source overview:
${compactText(cleanOverview, 500)}

7. Future prospects and catalysts
${buildIndustryOpportunity(company, record, intelligence)}

8. Technical and market sentiment evidence
${compactText(cleanTechnical)}

9. Recent news and announcements
${compactText(cleanNews)}

10. Corporate events
${compactText(cleanEvents)}

11. Ownership, insider/SAST and deals
${compactText([cleanOwnership, cleanSast, cleanDeals].filter(Boolean).join("\n\n"))}

12. Document search
${compactText(cleanDocuments)}

13. Next diligence
- Read the latest annual report and auditor notes.
- Check latest quarterly result and management commentary.
- Confirm whether cash flow supports reported profits.
- Compare valuation and ROCE against listed peers.
- Decide whether this is a compounding candidate, cyclical opportunity, fair-value hold, or potential trap.`;
}

function enrichWithTrendlyne(company: Company, record: FundamentalsRecord, intelligence: TrendlyneIntelligenceRecord) {
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
  const cashFlowQuality = record.cfo ? clampScore((financialStrength + ratioScore(record.cfo, 1, 0)) / 2 + 1) : company.scores.cashFlowQuality;
  const trendlyneDocuments: Company["documents"] = [
    { name: "Trendlyne overview and DVM", type: "Other", status: "Key Source" },
    { name: "Trendlyne ownership and SAST", type: "Exchange Filing", status: "Key Source" },
    { name: "Trendlyne document search", type: "Other", status: "To Review" }
  ];
  const cleanNews = cleanTrendlyneIntel("News and announcements", intelligence.news);
  const cleanEvents = cleanTrendlyneIntel("Corporate events", intelligence.events);
  const cleanTechnical = cleanTrendlyneIntel("Technicals", intelligence.technical);
  const cleanSast = cleanTrendlyneIntel("Insider / SAST", intelligence.sast);
  const trendlyneCatalysts: Company["catalysts"] = [];
  if (hasMeaningfulText(cleanNews)) {
    trendlyneCatalysts.push({
      title: "Trendlyne news and announcements review",
      date: "",
      status: "In Progress",
      notes: compactText(cleanNews, 260)
    });
  }
  if (hasMeaningfulText(cleanEvents)) {
    trendlyneCatalysts.push({
      title: "Trendlyne corporate events review",
      date: "",
      status: "Expected",
      notes: compactText(cleanEvents, 260)
    });
  }
  const trendlyneRisks: Company["risks"] = [];
  if (/below|negative|weak|volatility/i.test(intelligence.technical)) {
    trendlyneRisks.push({
      title: "Trendlyne technical weakness",
      probability: "Medium",
      impact: "Medium",
      mitigation: compactText(cleanTechnical, 220)
    });
  }
  if (/pledge|disposal|sell|sast|insider/i.test(intelligence.sast)) {
    trendlyneRisks.push({
      title: "Trendlyne insider/SAST watch",
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
  if (Number(record.pe) > 35 || (Number(record.dvmValuation) > 0 && Number(record.dvmValuation) < 45)) {
    trendlyneRisks.push({
      title: "Valuation risk",
      probability: "Medium",
      impact: "High",
      mitigation: `P/E is ${record.pe || "-"} and DVM valuation is ${record.dvmValuation || "-"}. Test reverse DCF and peer valuation.`
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
  const valuation = buildValuationCases(company, record);
  const aiOutputCompany = {
    ...company,
    businessSummary: setIfDraft(company.businessSummary, buildBusinessSummary(company, record, intelligence)),
    multibaggerCase: setIfDraft(company.multibaggerCase, buildMultibaggerCase(company, record, intelligence)),
    industryOpportunity: setIfDraft(company.industryOpportunity, buildIndustryOpportunity(company, record, intelligence)),
    managementAssessment: setIfDraft(company.managementAssessment, buildManagementAssessment(record, intelligence)),
    bullThesis: setIfDraft(company.bullThesis, buildBullThesis(company, record, intelligence)),
    bearThesis: setIfDraft(company.bearThesis, buildBearThesis(record, intelligence)),
    keyAssumptions: setIfDraft(company.keyAssumptions, buildKeyAssumptions(record)),
    thesisKillers: setIfDraft(company.thesisKillers, buildThesisKillers(record, intelligence))
  };

  return {
    ...aiOutputCompany,
    status: company.status === "Watchlist" ? "Researching" : company.status,
    dataSource: `${company.dataSource || "Company search"} + Trendlyne MCP (${new Date(intelligence.importedAt).toISOString().slice(0, 10)})`,
    aiPrompt: setIfDraft(company.aiPrompt, buildAnalystPrompt(company)),
    aiOutput: trendlyneResearchBrief(aiOutputCompany, record, intelligence),
    documents: mergeDocuments(company.documents, trendlyneDocuments),
    catalysts: mergeCatalysts(company.catalysts, trendlyneCatalysts),
    risks: mergeRisks(company.risks, trendlyneRisks),
    reviews: mergeReviews(company.reviews, [buildResearchReview(record, intelligence)]),
    valuation,
    scores: {
      ...company.scores,
      businessQuality: dvmDurability,
      managementQuality,
      financialStrength,
      growthRunway,
      moat: clampScore((dvmDurability + company.scores.moat) / 2),
      valuation: dvmValuation,
      industryTailwinds: dvmMomentum,
      cashFlowQuality,
      governance: governanceScore,
      riskReward: clampScore((dvmValuation + dvmDurability + financialStrength + growthRunway) / 4)
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

function formatNumber(value: number | string | null | undefined, decimals = 2) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return "";
  const fixed = numberValue.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "");
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
  const [searchMessage, setSearchMessage] = useState("Kite-ready search is available. Live LTP needs Kite credentials.");
  const [kiteStatus, setKiteStatus] = useState<KiteStatus | null>(null);
  const [trendlyneStatus, setTrendlyneStatus] = useState<TrendlyneStatus | null>(null);
  const [trendlyneLoading, setTrendlyneLoading] = useState(false);
  const [syncingSymbol, setSyncingSymbol] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [screen, setScreen] = useState({ roce: "15", growth: "15", debt: "1", pe: "50" });

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
    fetch("/api/kite/status")
      .then((response) => response.json())
      .then((status: KiteStatus) => setKiteStatus(status))
      .catch(() => setKiteStatus(null));
  }, [hydrated]);

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
        setSearchMessage(payload.message || `Showing ${payload.source === "kite" ? "Kite Connect" : "starter directory"} results.`);
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
  const filteredMini = data.companies.filter((company) =>
    `${company.name} ${company.ticker}`.toLowerCase().includes(sideQuery.toLowerCase())
  );
  const ranked = useMemo(() => [...data.companies].sort((a, b) => score(b) - score(a)), [data.companies]);

  function saveCompany(next: Company) {
    setData((current) => ({
      ...current,
      companies: current.companies.map((company) => (company.id === next.id ? next : company))
    }));
  }

  function findFundamentals(ticker: string, companyName: string, source = data.fundamentals) {
    const normalizedTicker = ticker.toUpperCase();
    const normalizedName = normalizeKey(companyName);
    return (
      Object.values(source).find((record) => record.ticker && record.ticker.toUpperCase() === normalizedTicker) ||
      Object.values(source).find((record) => {
        const recordName = normalizeKey(record.companyName);
        return recordName.includes(normalizedName) || normalizedName.includes(recordName);
      })
    );
  }

  function findShareholding(ticker: string, companyName: string, source = data.shareholding) {
    const normalizedTicker = ticker.toUpperCase();
    const normalizedName = normalizeKey(companyName);
    return (
      Object.values(source).find((record) => record.ticker && record.ticker.toUpperCase() === normalizedTicker) ||
      Object.values(source).find((record) => {
        const recordName = normalizeKey(record.companyName);
        return recordName.includes(normalizedName) || normalizedName.includes(recordName);
      })
    );
  }

  function findTrendlyneIntelligence(ticker: string, companyName: string, source = data.trendlyne) {
    const normalizedTicker = ticker.toUpperCase();
    const normalizedName = normalizeKey(companyName);
    return (
      Object.values(source).find((record) => record.ticker && record.ticker.toUpperCase() === normalizedTicker) ||
      Object.values(source).find((record) => {
        const recordName = normalizeKey(record.companyName);
        return recordName.includes(normalizedName) || normalizedName.includes(recordName);
      })
    );
  }

  function applyFundamentals(company: Company, record?: FundamentalsRecord) {
    if (!record) return company;
    const priceForPe = asNumber(company.financials.currentPrice) || asNumber(record.currentPrice);
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
        currentPrice: company.financials.currentPrice || record.currentPrice,
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
      window.alert("Select a company with an NSE ticker first.");
      return;
    }

    setSyncingSymbol(company.ticker);
    try {
      const record = await fetchNseShareholding(company.ticker);
      const key = record.ticker || company.ticker;
      setData((current) => ({
        ...current,
        shareholding: { ...current.shareholding, [key]: record },
        companies: current.companies.map((item) => {
          const matchesTicker = item.ticker.toUpperCase() === company.ticker.toUpperCase();
          const matchesName = normalizeKey(record.companyName).includes(normalizeKey(item.name));
          return matchesTicker || matchesName ? applyShareholding(item, record) : item;
        })
      }));
      setSelectedId(company.id);
      window.alert(`Synced NSE shareholding for ${record.companyName}: promoter holding ${record.promoterHolding || "-"}%.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not sync NSE shareholding.");
    } finally {
      setSyncingSymbol("");
    }
  }

  async function syncNseFinancials(company = selected) {
    if (!company?.ticker) {
      window.alert("Select a company with an NSE ticker first.");
      return;
    }

    setSyncingSymbol(company.ticker);
    try {
      const record = await fetchNseFinancials(company.ticker);
      const key = record.ticker || company.ticker;
      setData((current) => ({
        ...current,
        fundamentals: { ...current.fundamentals, [key]: record },
        companies: current.companies.map((item) => {
          const matchesTicker = item.ticker.toUpperCase() === company.ticker.toUpperCase();
          const matchesName = normalizeKey(record.companyName).includes(normalizeKey(item.name));
          return matchesTicker || matchesName ? applyFundamentals(item, record) : item;
        })
      }));
      setSelectedId(company.id);
      window.alert(`Synced NSE financials for ${record.companyName}: sales INR ${record.revenue || "-"} cr.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not sync NSE financials.");
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
      const [record, intelligence] = await Promise.all([
        fetchTrendlyneCompany(company.ticker),
        fetchTrendlyneIntelligence(company.ticker).catch(() => undefined)
      ]);
      const key = record.ticker || company.ticker;
      const intelligenceKey = intelligence?.ticker || key;
      setData((current) => ({
        ...current,
        fundamentals: { ...current.fundamentals, [key]: record },
        trendlyne: intelligence ? { ...current.trendlyne, [intelligenceKey]: intelligence } : current.trendlyne,
        companies: current.companies.map((item) => {
          const matchesTicker = item.ticker.toUpperCase() === company.ticker.toUpperCase();
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
    const existing = data.companies.find((company) => company.ticker.toUpperCase() === item.ticker);
    if (existing) {
      setSelectedId(existing.id);
      setActivePage("research");
      if (!existing.financials.promoterHolding) {
        await syncNseShareholding(existing);
      }
      if (!existing.financials.revenue || !existing.financials.profit) {
        await syncNseFinancials(existing);
      }
      return;
    }

    const company: Company = {
      ...blankCompany(),
      name: item.name,
      ticker: item.ticker,
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
      if (item.exchange === "NSE" || item.source?.includes("Kite")) {
        [fetchedShareholding, fetchedFinancials] = await Promise.all([
          fetchNseShareholding(item.ticker).catch(() => undefined),
          fetchNseFinancials(item.ticker).catch(() => undefined)
        ]);
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

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `imrs-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppData>;
        if (!parsed.companies) throw new Error("Missing companies");
        const companies = parsed.companies.map(normalizeCompany);
        setData({
          companies,
          portfolio: parsed.portfolio || [],
          fundamentals: parsed.fundamentals || {},
          shareholding: parsed.shareholding || {},
          trendlyne: parsed.trendlyne || {}
        });
        setSelectedId(companies[0]?.id || "");
        setActivePage("dashboard");
      } catch {
        window.alert("Invalid IMRS backup");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
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
        const tickerMatch = extracted.ticker && company.ticker.toUpperCase() === extracted.ticker.toUpperCase();
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

  function updateScore(key: ScoreKey, value: string) {
    if (!selected) return;
    saveCompany({ ...selected, scores: { ...selected.scores, [key]: Number(value) } });
  }

  function updateValuation(caseName: keyof Company["valuation"], key: keyof ValuationCase, value: string) {
    if (!selected) return;
    saveCompany({
      ...selected,
      valuation: {
        ...selected.valuation,
        [caseName]: { ...selected.valuation[caseName], [key]: value }
      }
    });
  }

  function buildResearchFromSavedData() {
    if (!selected) return;
    const record = findFundamentals(selected.ticker, selected.name);
    const intelligence = findTrendlyneIntelligence(selected.ticker, selected.name);
    if (!record || !intelligence) {
      window.alert("Sync Trendlyne Full first. IMRS needs both fundamentals and the intelligence pack to build the thesis.");
      return;
    }
    const withFundamentals = applyFundamentals(selected, record);
    saveCompany(enrichWithTrendlyne(withFundamentals, record, intelligence));
    setActiveTab("report");
    window.alert("Research report rebuilt from saved Trendlyne data.");
  }

  function generateStructuredAnalysis() {
    if (!selected) return;
    updateSelected({ aiOutput: buildInvestmentReportText(selected) });
    setActiveTab("report");
  }

  async function generateOpenAiReport() {
    if (!selected) return;

    setAiGenerating(true);
    try {
      const trendlyneIntel = findTrendlyneIntelligence(selected.ticker, selected.name);
      const response = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: selected,
          trendlyne: trendlyneIntel,
          ruleBasedReport: buildInvestmentReportText(selected)
        })
      });
      const payload = (await response.json()) as { report?: string; error?: string };
      if (!response.ok || !payload.report) {
        throw new Error(payload.error || "OpenAI report generation failed.");
      }
      updateSelected({ aiOutput: payload.report });
      setActiveTab("report");
      window.alert("OpenAI analyst report generated.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "OpenAI report generation failed.");
    } finally {
      setAiGenerating(false);
    }
  }

  function exportSelectedReportPdf() {
    if (!selected) return;
    const trendlyneIntel = findTrendlyneIntelligence(selected.ticker, selected.name);
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      window.alert("Chrome blocked the report window. Allow pop-ups for IMRS, then try Export PDF again.");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(buildPrintableReportHtml(selected, trendlyneIntel));
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => {
      reportWindow.print();
    }, 500);
  }

  function renderDashboard() {
    const companies = data.companies;
    const average = companies.length ? Math.round(companies.reduce((sum, company) => sum + score(company), 0) / companies.length) : 0;
    const owned = companies.filter((company) => company.status === "Owned").length;
    const buy = companies.filter((company) => company.status === "Buy Candidate").length;

    return (
      <>
        <PageHead eyebrow="Research command centre" title="Investment Dashboard">
          Track opportunities, financial quality, conviction, portfolio exposure and thesis progress.
        </PageHead>
        <div className="stats">
          <Stat label="Companies tracked" value={companies.length} />
          <Stat label="Owned positions" value={owned} />
          <Stat label="Buy candidates" value={buy} />
          <Stat label="Average score" value={`${average}/100`} />
        </div>
        <div className="portfolio-grid">
          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">Ranked universe</span>
                <h2>Research pipeline</h2>
              </div>
              <button onClick={createCompany} title="Create company">
                <Plus size={17} /> Company
              </button>
            </div>
            <CompanyTable companies={ranked} openCompany={openCompany} />
          </section>
          <aside className="panel">
            <span className="eyebrow">Quick intelligence</span>
            <h3>Research health</h3>
            <div className="kpi-list">
              <Kpi label="High conviction >=75" value={companies.filter((company) => score(company) >= 75).length} />
              <Kpi label="ROCE >=20%" value={companies.filter((company) => asNumber(company.financials.roce) >= 20).length} />
              <Kpi
                label="Sales growth >=20%"
                value={companies.filter((company) => asNumber(company.financials.salesGrowth) >= 20).length}
              />
              <Kpi
                label="Low debt <=0.5"
                value={companies.filter((company) => asNumber(company.financials.debtEquity) <= 0.5).length}
              />
            </div>
            <div className="note">
              Live market data will be added through a backend API. The starter directory is only a first lookup layer.
            </div>
          </aside>
        </div>
      </>
    );
  }

  function openCompany(id: string) {
    setSelectedId(id);
    setActiveTab("overview");
    setActivePage("research");
  }

  function renderSearch() {
    return (
      <>
        <PageHead eyebrow="Company discovery" title="Company Search">
          Search the company directory, then import a company into your research workspace.
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
              placeholder="Search by company name, ticker or sector"
            />
          </div>
          <div className="stack">
            {searchLoading ? <p>Searching...</p> : null}
            {searchResults.map((company) => (
              <div className="result-card" key={`${company.exchange}-${company.ticker}`}>
                <div>
                  <strong>{company.name}</strong>
                  <small>
                    {company.ticker} - {company.exchange} - {company.sector}
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

  function renderScreener() {
    const list = data.companies.filter(
      (company) =>
        asNumber(company.financials.roce) >= asNumber(screen.roce) &&
        asNumber(company.financials.salesGrowth) >= asNumber(screen.growth) &&
        (Number(company.financials.debtEquity) || 999) <= (Number(screen.debt) || 999) &&
        (Number(company.financials.pe) || 999) <= (Number(screen.pe) || 999)
    );

    return (
      <>
        <PageHead eyebrow="Opportunity discovery" title="Company Screener">
          Filter the companies already saved in IMRS using quality, growth and valuation criteria.
        </PageHead>
        <section className="panel">
          <div className="screen-grid">
            <label>
              Minimum ROCE %
              <input value={screen.roce} onChange={(event) => setScreen({ ...screen, roce: event.target.value })} type="number" />
            </label>
            <label>
              Minimum sales growth %
              <input value={screen.growth} onChange={(event) => setScreen({ ...screen, growth: event.target.value })} type="number" />
            </label>
            <label>
              Maximum debt/equity
              <input value={screen.debt} onChange={(event) => setScreen({ ...screen, debt: event.target.value })} type="number" />
            </label>
            <label>
              Maximum P/E
              <input value={screen.pe} onChange={(event) => setScreen({ ...screen, pe: event.target.value })} type="number" />
            </label>
          </div>
          <div className="stack" style={{ marginTop: 14 }}>
            {list.map((company) => (
              <div className="result-card" key={company.id} onClick={() => openCompany(company.id)}>
                <div>
                  <strong>{company.name}</strong>
                  <small>
                    ROCE {company.financials.roce || "-"}% - Growth {company.financials.salesGrowth || "-"}% - D/E{" "}
                    {company.financials.debtEquity || "-"} - P/E {company.financials.pe || "-"}
                  </small>
                </div>
                <span className="score">{score(company)}</span>
              </div>
            ))}
            {list.length === 0 ? <p>No saved companies match the current criteria.</p> : null}
          </div>
        </section>
      </>
    );
  }

  function renderWatchlist() {
    const list = data.companies.filter((company) => company.watchlisted);
    return (
      <>
        <PageHead eyebrow="Opportunity radar" title="Watchlist">
          Maintain a focused list of companies requiring deeper work or a better entry valuation.
        </PageHead>
        <section className="panel">
          <div className="section-head">
            <h2>{list.length} companies</h2>
            <button onClick={createCompany} title="Create company">
              <Plus size={17} /> Company
            </button>
          </div>
          <div className="stack">
            {list.map((company) => (
              <div className="result-card" key={company.id} onClick={() => openCompany(company.id)}>
                <div>
                  <strong>{company.name}</strong>
                  <small>
                    {company.ticker || "No ticker"} - {company.sector || "No sector"} - {company.status}
                  </small>
                </div>
                <span className="score">{score(company)}</span>
              </div>
            ))}
            {list.length === 0 ? <p>No companies in your watchlist.</p> : null}
          </div>
        </section>
      </>
    );
  }

  function renderPortfolio() {
    const total = data.portfolio.reduce((sum, position) => sum + asNumber(position.quantity) * asNumber(position.currentPrice), 0);
    const cost = data.portfolio.reduce((sum, position) => sum + asNumber(position.quantity) * asNumber(position.averagePrice), 0);
    const pnl = total - cost;

    function updatePosition(index: number, key: keyof PortfolioPosition, value: string) {
      setData((current) => ({
        ...current,
        portfolio: current.portfolio.map((position, i) => (i === index ? { ...position, [key]: value } : position))
      }));
    }

    return (
      <>
        <PageHead eyebrow="Capital allocation" title="Portfolio">
          Track position size, cost, current value and concentration.
        </PageHead>
        <div className="stats">
          <Stat label="Invested value" value={`INR ${Math.round(cost).toLocaleString("en-IN")}`} />
          <Stat label="Current value" value={`INR ${Math.round(total).toLocaleString("en-IN")}`} />
          <Stat label="Unrealised P&L" value={`INR ${Math.round(pnl).toLocaleString("en-IN")}`} />
          <Stat label="Positions" value={data.portfolio.length} />
        </div>
        <section className="panel">
          <div className="section-head">
            <h2>Positions</h2>
            <button
              onClick={() =>
                setData((current) => ({
                  ...current,
                  portfolio: [{ name: "", quantity: "", averagePrice: "", currentPrice: "" }, ...current.portfolio]
                }))
              }
              title="Add position"
            >
              <Plus size={17} /> Position
            </button>
          </div>
          <div className="stack">
            {data.portfolio.map((position, index) => (
              <div className="form-row" key={index}>
                <input placeholder="Company / ticker" value={position.name} onChange={(event) => updatePosition(index, "name", event.target.value)} />
                <input placeholder="Quantity" value={position.quantity} onChange={(event) => updatePosition(index, "quantity", event.target.value)} type="number" />
                <input
                  placeholder="Avg price INR"
                  value={position.averagePrice}
                  onChange={(event) => updatePosition(index, "averagePrice", event.target.value)}
                  type="number"
                />
                <input
                  placeholder="Current price INR"
                  value={position.currentPrice}
                  onChange={(event) => updatePosition(index, "currentPrice", event.target.value)}
                  type="number"
                />
                <button
                  className="danger"
                  onClick={() =>
                    setData((current) => ({ ...current, portfolio: current.portfolio.filter((_, positionIndex) => positionIndex !== index) }))
                  }
                  title="Remove position"
                >
                  X
                </button>
              </div>
            ))}
            {data.portfolio.length === 0 ? <p>No portfolio positions yet.</p> : null}
          </div>
        </section>
      </>
    );
  }

  function renderCommittee() {
    const company = selected || data.companies[0];
    if (!company) return <p>Create a company first.</p>;
    const agents = [
      ["Business Analyst", company.scores.businessQuality, "Business model, customers, unit economics and scalability"],
      ["Financial Analyst", company.scores.financialStrength, "Growth, margins, returns, balance sheet and cash conversion"],
      ["Forensic Accountant", company.scores.governance, "Governance, accounting quality and red flags"],
      ["Industry Expert", company.scores.industryTailwinds, "Industry structure, market size and competitive intensity"],
      ["Risk Manager", company.scores.riskReward, "Downside, thesis killers and permanent-capital-loss risk"],
      ["Chief Investment Officer", score(company) / 10, "Integrated conviction and portfolio suitability"]
    ] as const;

    return (
      <>
        <PageHead eyebrow="Multi-agent review" title="Investment Committee">
          Specialist views are generated from your recorded scores until backend AI integration is added.
        </PageHead>
        <section className="panel">
          <div className="toolbar">
            <select value={company.id} onChange={(event) => setSelectedId(event.target.value)}>
              {data.companies.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="committee-grid">
            {agents.map(([name, agentScore, description]) => (
              <div className="agent-card" key={name}>
                <div>
                  <strong>{name}</strong>
                  <small>{description}</small>
                </div>
                <span className="agent-badge">{Math.round(agentScore * 10)}/100</span>
              </div>
            ))}
          </div>
          <div className="info">
            <strong>Committee verdict:</strong> {verdict(company)}
          </div>
        </section>
      </>
    );
  }

  function renderKite() {
    return (
      <>
        <PageHead eyebrow="Market data connection" title="Kite Connect">
          Connect your Zerodha Kite session to enable live LTP in company search.
        </PageHead>
        <section className="panel">
          <div className="grid-3">
            <Kpi label="API key" value={kiteStatus?.apiKeyConfigured ? "Configured" : "Missing"} />
            <Kpi label="API secret" value={kiteStatus?.apiSecretConfigured ? "Configured" : "Missing"} />
            <Kpi label="Session" value={kiteStatus?.connected ? "Connected" : "Not connected"} />
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <a href="/api/kite/login" style={{ textDecoration: "none" }}>
              <button type="button">
                <KeyRound size={17} /> Connect Kite
              </button>
            </a>
          </div>
          <div className="info">
            Add <strong>KITE_API_KEY</strong> and <strong>KITE_API_SECRET</strong> in Vercel first. Then click Connect Kite,
            complete Zerodha login, and return to IMRS. The session is stored in this browser as a secure cookie.
          </div>
          <div className="note">
            IMRS uses Kite for market-data lookup only. It does not place orders.
          </div>
        </section>
      </>
    );
  }

  function renderFundamentals() {
    const records = Object.values(data.fundamentals).sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    const shareholdingRecords = Object.values(data.shareholding).sort((a, b) => b.importedAt.localeCompare(a.importedAt));

    return (
      <>
        <PageHead eyebrow="Source-backed data" title="Fundamentals Import">
          Combine Kite prices, NSE filings, Screener workbooks and Trendlyne exports into one company record.
        </PageHead>
        <section className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Live data connector</span>
              <h2>Trendlyne MCP</h2>
            </div>
            <div className="top-actions">
              <button className="secondary" onClick={refreshTrendlyneStatus} disabled={trendlyneLoading}>
                <Download size={17} /> {trendlyneLoading ? "Checking" : "Check MCP"}
              </button>
              <button onClick={() => syncTrendlyneCompany()} disabled={!selected?.ticker || Boolean(syncingSymbol)}>
                <Download size={17} /> {syncingSymbol ? "Syncing" : "Sync + Build Thesis"}
              </button>
            </div>
          </div>
          <div className="stats compact-stats">
            <Stat label="MCP URL" value={trendlyneStatus?.urlConfigured ? "Configured" : "Missing"} />
            <Stat
              label="Auth"
              value={trendlyneStatus?.tokenConfigured || trendlyneStatus?.apiKeyConfigured ? "Configured" : "Not set"}
            />
            <Stat label="Connection" value={trendlyneStatus?.connected ? "Connected" : "Not connected"} />
            <Stat label="Tools" value={trendlyneStatus?.toolCount ? String(trendlyneStatus.toolCount) : "0"} />
          </div>
          <div className={trendlyneStatus?.connected ? "info" : "note"}>
            {trendlyneStatus?.connected
              ? `Trendlyne MCP is reachable through ${trendlyneStatus.transport}. IMRS can now fill fundamentals and build a first-pass research thesis.`
              : trendlyneStatus?.error || trendlyneStatus?.message || "Add TRENDLYNE_MCP_URL in Vercel to enable this connector."}
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
              <h2>NSE Financial Results</h2>
            </div>
            <button className="secondary" onClick={() => syncNseFinancials()} disabled={!selected?.ticker || Boolean(syncingSymbol)}>
              <Download size={17} /> {syncingSymbol ? "Syncing" : "Sync NSE Financials"}
            </button>
          </div>
          <div className="info">
            IMRS syncs annual NSE financial-result filings for the selected company and fills revenue, profit, EPS, sales growth,
            profit growth and operating margin where available.
          </div>
          <div className="note">ROE, ROCE, debt/equity and cash-flow metrics still need richer balance-sheet data from Trendlyne or another licensed source.</div>
        </section>
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Subscription data</span>
              <h2>Trendlyne Export</h2>
            </div>
            <label className="file-button">
              <Upload size={17} /> Upload Trendlyne
              <input type="file" accept=".csv,.xlsx" onChange={importTrendlyne} />
            </label>
          </div>
          <div className="info">
            Use Trendlyne Excel Connect/Data Downloader exports for richer fields such as ROE, ROCE, debt/equity, operating cash
            flow, FII/DII holding, institutional ownership, DVM scores and analyst score.
          </div>
          <div className="note">
            This uses your official export file. A direct background sync can be added later if Trendlyne provides an official API or
            live export URL for your subscription.
          </div>
        </section>
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Upload fallback</span>
              <h2>Screener Excel</h2>
            </div>
            <label className="file-button">
              <Upload size={17} /> Upload Excel
              <input type="file" accept=".xlsx" onChange={importFundamentals} />
            </label>
          </div>
          <div className="info">
            This importer is built for Screener company Excel exports like your Reliance workbook. It extracts the Data Sheet and fills
            market cap, revenue, profit, EPS, P/E, ROE, ROCE, debt/equity, growth, OPM and cash flow.
          </div>
          <div className="note">Promoter holding is not present in this Screener workbook format, so it remains manual for now.</div>
        </section>
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Exchange filing</span>
              <h2>NSE Shareholding CSV</h2>
            </div>
            <div className="top-actions">
              <button className="secondary" onClick={() => syncNseShareholding()} disabled={!selected?.ticker || Boolean(syncingSymbol)}>
                <Download size={17} /> {syncingSymbol ? "Syncing" : "Sync NSE"}
              </button>
              <label className="file-button">
                <Upload size={17} /> Upload CSV
                <input type="file" accept=".csv" onChange={importShareholding} />
              </label>
            </div>
          </div>
          <div className="info">
            IMRS now syncs promoter holding directly from NSE when a company is imported from search. Use Sync NSE to refresh the
            selected company, or upload a CSV only as a fallback.
          </div>
          <div className="note">This fills the Promoter holding % field from the latest row in the NSE filing.</div>
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
            {shareholdingRecords.length === 0 ? <p>No NSE shareholding CSV files imported yet.</p> : null}
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
          <div className="hero-score">
            <span>Conviction score</span>
            <strong>{score(selected)}</strong>
            <small>/100</small>
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
            <button className="soft" onClick={() => updateSelected({ watchlisted: !selected.watchlisted })}>
              {selected.watchlisted ? "Remove from watchlist" : "Add to watchlist"}
            </button>
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

    if (activeTab === "scorecard") {
      return (
        <div className="score-grid">
          {(Object.entries(scoreLabels) as Array<[ScoreKey, string]>).map(([key, label]) => (
            <article className="panel score-item" key={key}>
              <div>
                <strong>{label}</strong>
                <span>{company.scores[key]}/10</span>
              </div>
              <input min="0" max="10" value={company.scores[key]} onChange={(event) => updateScore(key, event.target.value)} type="range" />
            </article>
          ))}
        </div>
      );
    }

    if (activeTab === "report") {
      const diagnostics = investmentDiagnostics(company);
      const reportText = company.aiOutput || buildInvestmentReportText(company);
      const weighted = weightedExpectedPrice(company);
      const bullets = getReportBullets(company);
      return (
        <div className="report-stack">
          <section className="panel report-hero">
            <div>
              <span className="eyebrow">Investment committee report</span>
              <h2>{diagnostics.finalVerdict}</h2>
              <p>
                This page combines Kite, NSE, Trendlyne and saved IMRS notes into one decision view. Treat it as research support, not
                financial advice.
              </p>
            </div>
            <div className="toolbar">
              <button onClick={buildResearchFromSavedData} disabled={!trendlyneIntel || Boolean(syncingSymbol)}>
                <FileText size={17} /> Rebuild from Trendlyne
              </button>
              <button onClick={generateOpenAiReport} disabled={aiGenerating}>
                <NotebookText size={17} /> {aiGenerating ? "Generating..." : "Generate AI Report"}
              </button>
              <button className="secondary" onClick={exportSelectedReportPdf}>
                <FileDown size={17} /> Export PDF
              </button>
            </div>
          </section>

          <div className="stats report-stats">
            <Stat label="Conviction score" value={`${score(company)}/100`} />
            <Stat label="Multibagger probability" value={`${diagnostics.multibaggerProbability}/100`} />
            <Stat label="Trap probability" value={`${diagnostics.trapProbability}/100`} />
            <Stat label="Weighted scenario price" value={`INR ${Math.round(weighted).toLocaleString("en-IN")}`} />
          </div>

          <div className="grid-3">
            <article className="panel">
              <span className="eyebrow">Business quality</span>
              <h3>{company.scores.businessQuality}/10</h3>
              <p>{company.businessSummary || "Business quality still needs source-backed notes."}</p>
            </article>
            <article className="panel">
              <span className="eyebrow">Financial quality</span>
              <h3>{company.scores.financialStrength}/10</h3>
              <p>
                ROE {company.financials.roe || "-"}%, ROCE {company.financials.roce || "-"}%, debt/equity{" "}
                {company.financials.debtEquity || "-"}, profit growth {company.financials.profitGrowth || "-"}%.
              </p>
            </article>
            <article className="panel">
              <span className="eyebrow">Valuation</span>
              <h3>{company.scores.valuation}/10</h3>
              <p>
                P/E {company.financials.pe || "-"}; bear/base/bull INR{" "}
                {Math.round(impliedPrice(company.valuation.bear)).toLocaleString("en-IN")} /{" "}
                {Math.round(impliedPrice(company.valuation.base)).toLocaleString("en-IN")} /{" "}
                {Math.round(impliedPrice(company.valuation.bull)).toLocaleString("en-IN")}.
              </p>
            </article>
          </div>

          <div className="grid-2">
            <article className="panel">
              <span className="eyebrow">What must happen for 5x/10x</span>
              <ul className="report-list">
                {bullets.fiveTen.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <span className="eyebrow">What would make this fail</span>
              <ul className="report-list danger-list">
                {bullets.fail.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="grid-2">
            <article className="panel">
              <span className="eyebrow">Ownership</span>
              <h3>Promoter {company.financials.promoterHolding || "-"}%</h3>
              <p>
                FII {company.financials.fiiHolding || "-"}%, DII {company.financials.diiHolding || "-"}%, institutional{" "}
                {company.financials.institutionalHolding || "-"}%.
              </p>
            </article>
            <article className="panel">
              <span className="eyebrow">Growth runway</span>
              <h3>{company.scores.growthRunway}/10</h3>
              <p>{company.industryOpportunity || company.multibaggerCase || "Growth runway still needs evidence."}</p>
            </article>
          </div>

          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">Final research memo</span>
                <h2>Stock research report</h2>
              </div>
              <button className="secondary" onClick={generateStructuredAnalysis}>
                <FileText size={17} /> Refresh rule-based memo
              </button>
            </div>
            <textarea className="report-output" value={reportText} onChange={(event) => updateSelected({ aiOutput: event.target.value })} />
          </section>
        </div>
      );
    }

    if (activeTab === "thesis") {
      return (
        <div className="grid-2">
          <TextCard title="Bull thesis" value={company.bullThesis} onChange={(value) => updateSelected({ bullThesis: value })} />
          <TextCard title="Bear thesis" value={company.bearThesis} onChange={(value) => updateSelected({ bearThesis: value })} />
          <TextCard title="Key assumptions" value={company.keyAssumptions} onChange={(value) => updateSelected({ keyAssumptions: value })} />
          <TextCard title="Thesis killers" value={company.thesisKillers} onChange={(value) => updateSelected({ thesisKillers: value })} />
        </div>
      );
    }

    if (activeTab === "risks") {
      return (
        <section className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Downside laboratory</span>
              <h2>Risk register</h2>
            </div>
            <button
              onClick={() =>
                updateSelected({
                  risks: [{ title: "", probability: "Medium", impact: "Medium", mitigation: "" }, ...company.risks]
                })
              }
            >
              <Plus size={17} /> Risk
            </button>
          </div>
          <div className="stack">
            {company.risks.map((risk, index) => (
              <div className="form-row" key={index}>
                <input
                  placeholder="Risk"
                  value={risk.title}
                  onChange={(event) => updateArray("risks", index, { ...risk, title: event.target.value })}
                />
                <select value={risk.probability} onChange={(event) => updateArray("risks", index, { ...risk, probability: event.target.value })}>
                  {["Low", "Medium", "High"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <select value={risk.impact} onChange={(event) => updateArray("risks", index, { ...risk, impact: event.target.value })}>
                  {["Low", "Medium", "High"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <input
                  placeholder="Mitigation or trigger"
                  value={risk.mitigation}
                  onChange={(event) => updateArray("risks", index, { ...risk, mitigation: event.target.value })}
                />
                <button className="danger" onClick={() => removeArrayItem("risks", index)}>
                  X
                </button>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === "catalysts") {
      return (
        <section className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Re-rating triggers</span>
              <h2>Catalyst tracker</h2>
            </div>
            <button
              onClick={() =>
                updateSelected({
                  catalysts: [{ title: "", date: "", status: "Expected", notes: "" }, ...company.catalysts]
                })
              }
            >
              <Plus size={17} /> Catalyst
            </button>
          </div>
          <div className="stack">
            {company.catalysts.map((catalyst, index) => (
              <div className="form-row" key={index}>
                <input
                  placeholder="Catalyst"
                  value={catalyst.title}
                  onChange={(event) => updateArray("catalysts", index, { ...catalyst, title: event.target.value })}
                />
                <input
                  type="date"
                  value={catalyst.date}
                  onChange={(event) => updateArray("catalysts", index, { ...catalyst, date: event.target.value })}
                />
                <select value={catalyst.status} onChange={(event) => updateArray("catalysts", index, { ...catalyst, status: event.target.value })}>
                  {["Expected", "In Progress", "Delivered", "Delayed", "Failed"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <input
                  placeholder="Evidence and notes"
                  value={catalyst.notes}
                  onChange={(event) => updateArray("catalysts", index, { ...catalyst, notes: event.target.value })}
                />
                <button className="danger" onClick={() => removeArrayItem("catalysts", index)}>
                  X
                </button>
              </div>
            ))}
          </div>
        </section>
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
                    onChange={(event) => updateArray("documents", index, { ...document, name: event.target.value })}
                  />
                  <small>
                    {document.type} - {document.status}
                  </small>
                </div>
                <div className="toolbar">
                  <select value={document.type} onChange={(event) => updateArray("documents", index, { ...document, type: event.target.value })}>
                    {["Annual Report", "Concall", "Investor Presentation", "Credit Rating", "Exchange Filing", "Other"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <select value={document.status} onChange={(event) => updateArray("documents", index, { ...document, status: event.target.value })}>
                    {["To Review", "Reviewed", "Key Source"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <button className="danger" onClick={() => removeArrayItem("documents", index)}>
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === "ai") {
      return (
        <>
          {trendlyneIntel ? (
            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Trendlyne MCP</span>
                  <h2>Market intelligence pack</h2>
                </div>
                <small>{new Date(trendlyneIntel.importedAt).toLocaleString()}</small>
              </div>
              <div className="grid-2">
                <IntelCard title="Overview and DVM" value={trendlyneIntel.overview} />
                <IntelCard title="Technicals" value={trendlyneIntel.technical} />
                <IntelCard title="News and announcements" value={trendlyneIntel.news} />
                <IntelCard title="Corporate events" value={trendlyneIntel.events} />
                <IntelCard title="Ownership" value={trendlyneIntel.shareholding} />
                <IntelCard title="Insider / SAST" value={trendlyneIntel.sast} />
                <IntelCard title="Bulk and block deals" value={trendlyneIntel.bulkBlock} />
                <IntelCard title="Document search" value={trendlyneIntel.documents} />
              </div>
            </section>
          ) : (
            <div className="info">Use Fundamentals, then Sync Trendlyne Full, to pull the full Trendlyne intelligence pack for this company.</div>
          )}
          <div className="grid-2" style={{ marginTop: 14 }}>
            <section className="panel">
              <span className="eyebrow">Research instruction</span>
              <h3>AI analysis prompt</h3>
              <textarea value={company.aiPrompt} onChange={(event) => updateSelected({ aiPrompt: event.target.value })} />
              <div className="toolbar" style={{ marginTop: 10 }}>
                <button onClick={buildResearchFromSavedData} disabled={!trendlyneIntel}>
                  <FileText size={17} /> Build thesis from Trendlyne
                </button>
                <button onClick={generateOpenAiReport} disabled={aiGenerating}>
                  <NotebookText size={17} /> {aiGenerating ? "Generating..." : "OpenAI report"}
                </button>
                <button className="secondary" onClick={generateStructuredAnalysis}>
                  <FileText size={17} /> Manual draft
                </button>
              </div>
              <div className="note">
                Trendlyne builds the rule-based evidence pack. OpenAI writes a fuller analyst memo when OPENAI_API_KEY is configured in Vercel.
              </div>
            </section>
            <section className="panel">
              <span className="eyebrow">Research output</span>
              <h3>Analysis workspace</h3>
              <textarea value={company.aiOutput} onChange={(event) => updateSelected({ aiOutput: event.target.value })} />
            </section>
          </div>
        </>
      );
    }

    if (activeTab === "reviews") {
      return (
        <section>
          <div className="section-head">
            <div>
              <span className="eyebrow">Living investment journal</span>
              <h2>Quarterly reviews</h2>
            </div>
            <button
              onClick={() =>
                updateSelected({
                  reviews: [{ quarter: "", verdict: "Unchanged", notes: "" }, ...company.reviews]
                })
              }
            >
              <Plus size={17} /> Review
            </button>
          </div>
          <div className="stack">
            {company.reviews.map((review, index) => (
              <article className="panel" key={index}>
                <div className="review-head">
                  <input
                    placeholder="Quarter, e.g. Q1 FY27"
                    value={review.quarter}
                    onChange={(event) => updateArray("reviews", index, { ...review, quarter: event.target.value })}
                  />
                  <select value={review.verdict} onChange={(event) => updateArray("reviews", index, { ...review, verdict: event.target.value })}>
                    {["Thesis Stronger", "Unchanged", "Thesis Weaker", "Exit Triggered"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <button className="danger" onClick={() => removeArrayItem("reviews", index)}>
                    X
                  </button>
                </div>
                <textarea
                  style={{ marginTop: 8 }}
                  value={review.notes}
                  onChange={(event) => updateArray("reviews", index, { ...review, notes: event.target.value })}
                />
              </article>
            ))}
          </div>
        </section>
      );
    }

    const weighted = (["bear", "base", "bull"] as const).reduce((sum, key) => {
      const scenario = company.valuation[key];
      return sum + asNumber(scenario.eps) * asNumber(scenario.pe) * (asNumber(scenario.probability) / 100);
    }, 0);

    return (
      <>
        <div className="grid-3">
          {(["bear", "base", "bull"] as const).map((caseName) => {
            const scenario = company.valuation[caseName];
            const implied = asNumber(scenario.eps) * asNumber(scenario.pe);
            return (
              <article className="panel valuation-card" key={caseName}>
                <span className="eyebrow">{caseName} case</span>
                <label>
                  EPS CAGR assumption %
                  <input value={scenario.revenueGrowth} onChange={(event) => updateValuation(caseName, "revenueGrowth", event.target.value)} type="number" />
                </label>
                <label>
                  Future EPS INR
                  <input value={scenario.eps} onChange={(event) => updateValuation(caseName, "eps", event.target.value)} type="number" />
                </label>
                <label>
                  Exit P/E
                  <input value={scenario.pe} onChange={(event) => updateValuation(caseName, "pe", event.target.value)} type="number" />
                </label>
                <label>
                  Probability %
                  <input value={scenario.probability} onChange={(event) => updateValuation(caseName, "probability", event.target.value)} type="number" />
                </label>
                <div className="implied">
                  <span>Implied price</span>
                  <strong>INR {Math.round(implied).toLocaleString("en-IN")}</strong>
                </div>
              </article>
            );
          })}
        </div>
        <article className="panel weighted">
          <span>Probability-weighted expected price</span>
          <strong>INR {Math.round(weighted).toLocaleString("en-IN")}</strong>
          <small className="muted">Scenario output, not a guaranteed target</small>
        </article>
      </>
    );
  }

  function updateArray<K extends "risks" | "catalysts" | "reviews" | "documents">(key: K, index: number, value: Company[K][number]) {
    if (!selected) return;
    const currentItems = selected[key];
    saveCompany({ ...selected, [key]: currentItems.map((item, itemIndex) => (itemIndex === index ? value : item)) });
  }

  function removeArrayItem<K extends "risks" | "catalysts" | "reviews" | "documents">(key: K, index: number) {
    if (!selected) return;
    saveCompany({ ...selected, [key]: selected[key].filter((_, itemIndex) => itemIndex !== index) });
  }

  const navItems: Array<[PageId, string, React.ReactNode]> = [
    ["dashboard", "Dashboard", <BarChart3 size={16} key="dashboard" />],
    ["search", "Search", <Search size={16} key="search" />],
    ["screener", "Screener", <Gauge size={16} key="screener" />],
    ["watchlist", "Watchlist", <Database size={16} key="watchlist" />],
    ["portfolio", "Portfolio", <BriefcaseBusiness size={16} key="portfolio" />],
    ["fundamentals", "Fundamentals", <FileText size={16} key="fundamentals" />],
    ["committee", "Committee", <Users size={16} key="committee" />],
    ["research", "Research", <FlaskConical size={16} key="research" />],
    ["kite", "Kite", <KeyRound size={16} key="kite" />]
  ];

  if (!hydrated) {
    return (
      <main className="shell">
        <div className="topbar">
          <div className="brand">
            <div className="brandmark">I</div>
            <div>
              <strong>IMRS Enterprise</strong>
              <small>Investment Research OS</small>
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
            <small>Investment Research OS</small>
          </div>
        </div>
        <div className="top-actions">
          <button className="secondary" onClick={exportData} title="Export backup">
            <Download size={17} /> Export
          </button>
          <label className="secondary file-button">
            <Upload size={17} /> Import
            <input type="file" accept=".json" onChange={importData} />
          </label>
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
                  {company.ticker || "No ticker"} - {score(company)}/100
                </small>
              </button>
            ))}
          </div>
        </aside>

        <section className="content">
          {activePage === "dashboard" ? renderDashboard() : null}
          {activePage === "search" ? renderSearch() : null}
          {activePage === "screener" ? renderScreener() : null}
          {activePage === "watchlist" ? renderWatchlist() : null}
          {activePage === "portfolio" ? renderPortfolio() : null}
          {activePage === "fundamentals" ? renderFundamentals() : null}
          {activePage === "committee" ? renderCommittee() : null}
          {activePage === "research" ? renderResearch() : null}
          {activePage === "kite" ? renderKite() : null}
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
            <th>Sector</th>
            <th>Status</th>
            <th>ROCE</th>
            <th>Growth</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr onClick={() => openCompany(company.id)} key={company.id}>
              <td>
                <strong>{company.name}</strong>
                <small>{company.ticker}</small>
              </td>
              <td>{company.sector || "-"}</td>
              <td>
                <span className="pill">{company.status}</span>
              </td>
              <td>{company.financials.roce || "-"}{company.financials.roce ? "%" : ""}</td>
              <td>{company.financials.salesGrowth || "-"}{company.financials.salesGrowth ? "%" : ""}</td>
              <td>
                <span className="score">{score(company)}</span>
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

function IntelCard({ title, value }: { title: string; value: string }) {
  const cleanValue = cleanTrendlyneIntel(title, value);
  return (
    <article className="intel-card">
      <h3>{title}</h3>
      <pre>{cleanValue}</pre>
    </article>
  );
}
