"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  Database,
  Download,
  FileText,
  FlaskConical,
  Gauge,
  Plus,
  Search,
  Upload,
  Users
} from "lucide-react";
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
  salesGrowth: string;
  profitGrowth: string;
  opm: string;
  cfo: string;
  currentPrice: string;
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

type PageId = "dashboard" | "search" | "screener" | "watchlist" | "portfolio" | "committee" | "research";
type TabId =
  | "overview"
  | "financials"
  | "scorecard"
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
    salesGrowth: "",
    profitGrowth: "",
    opm: "",
    cfo: "",
    currentPrice: ""
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
      salesGrowth: "22",
      profitGrowth: "28",
      opm: "14",
      cfo: "68",
      currentPrice: "432"
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
  return {
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

function asNumber(value: string) {
  return Number(value) || 0;
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<AppData>({ companies: [demoCompany()], portfolio: [] });
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedId, setSelectedId] = useState("");
  const [sideQuery, setSideQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>(starterCompanies);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState("Starter directory ready. Add a market-data API key for live search.");
  const [screen, setScreen] = useState({ roce: "15", growth: "15", debt: "1", pe: "50" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppData>;
        const companies = (parsed.companies || []).map(normalizeCompany);
        setData({ companies: companies.length ? companies : [demoCompany()], portfolio: parsed.portfolio || [] });
        setSelectedId(companies[0]?.id || "");
      } else {
        const sample = demoCompany();
        setData({ companies: [sample], portfolio: [] });
        setSelectedId(sample.id);
      }
    } catch {
      const sample = demoCompany();
      setData({ companies: [sample], portfolio: [] });
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
        setSearchMessage(payload.message || `Showing ${payload.source === "twelve-data" ? "live API" : "starter directory"} results.`);
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

  function createCompany() {
    const company = blankCompany();
    setData((current) => ({ ...current, companies: [company, ...current.companies] }));
    setSelectedId(company.id);
    setActiveTab("overview");
    setActivePage("research");
  }

  function importStarterCompany(item: CompanySearchResult) {
    const existing = data.companies.find((company) => company.ticker.toUpperCase() === item.ticker);
    if (existing) {
      setSelectedId(existing.id);
      setActivePage("research");
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

    setData((current) => ({ ...current, companies: [company, ...current.companies] }));
    setSelectedId(company.id);
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
        setData({ companies, portfolio: parsed.portfolio || [] });
        setSelectedId(companies[0]?.id || "");
        setActivePage("dashboard");
      } catch {
        window.alert("Invalid IMRS backup");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
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

  function generateStructuredAnalysis() {
    if (!selected) return;
    const f = selected.financials;
    const text = `IMRS Structured Draft - ${selected.name}

Business:
${selected.businessSummary || "Business summary not yet entered."}

Growth case:
${selected.multibaggerCase || "Multibagger case not yet entered."}

Financial snapshot:
Revenue INR ${f.revenue || "-"} crore; Profit INR ${f.profit || "-"} crore; ROCE ${f.roce || "-"}%; ROE ${
      f.roe || "-"
    }%; Sales growth ${f.salesGrowth || "-"}%; Profit growth ${f.profitGrowth || "-"}%; Debt/Equity ${
      f.debtEquity || "-"
    }; P/E ${f.pe || "-"}.

Management:
${selected.managementAssessment || "Management assessment not yet entered."}

Bull thesis:
${selected.bullThesis || "Not entered."}

Bear thesis:
${selected.bearThesis || "Not entered."}

Committee verdict:
${verdict(selected)}

Required next step:
Verify all figures, review primary documents, test thesis killers and complete valuation before making an investment decision.`;
    updateSelected({ aiOutput: text });
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
        ["salesGrowth", "Sales growth %"],
        ["profitGrowth", "Profit growth %"],
        ["opm", "Operating margin %"],
        ["cfo", "Operating cash flow INR crore"],
        ["currentPrice", "Current price INR"]
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
        <div className="grid-2">
          <section className="panel">
            <span className="eyebrow">Research instruction</span>
            <h3>AI analysis prompt</h3>
            <textarea value={company.aiPrompt} onChange={(event) => updateSelected({ aiPrompt: event.target.value })} />
            <button style={{ marginTop: 10 }} onClick={generateStructuredAnalysis}>
              <FileText size={17} /> Generate structured draft
            </button>
            <div className="note">The first AI backend will replace this draft generator with real model analysis.</div>
          </section>
          <section className="panel">
            <span className="eyebrow">Research output</span>
            <h3>Analysis workspace</h3>
            <textarea value={company.aiOutput} onChange={(event) => updateSelected({ aiOutput: event.target.value })} />
          </section>
        </div>
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
                  Revenue CAGR %
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
    ["committee", "Committee", <Users size={16} key="committee" />],
    ["research", "Research", <FlaskConical size={16} key="research" />]
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
          {activePage === "committee" ? renderCommittee() : null}
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
