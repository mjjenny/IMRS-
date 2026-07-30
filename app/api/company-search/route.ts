import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SearchResult = {
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
  source: string;
};

const starterCompanies: SearchResult[] = [
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
    note: "Depository infrastructure and capital-market participation play.",
    source: "IMRS starter directory"
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
    note: "EMS scale, import substitution and manufacturing outsourcing theme.",
    source: "IMRS starter directory"
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
    note: "Defence order book and domestic aerospace capability compounder.",
    source: "IMRS starter directory"
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
    note: "Retail format execution, Zudio growth and operating leverage story.",
    source: "IMRS starter directory"
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
    note: "High-growth EMS and industrial electronics platform.",
    source: "IMRS starter directory"
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
    note: "Software-defined vehicle and automotive engineering services specialist.",
    source: "IMRS starter directory"
  }
];

function starterSearch(query: string) {
  const needle = query.toLowerCase();
  return starterCompanies.filter((company) =>
    `${company.name} ${company.ticker} ${company.sector}`.toLowerCase().includes(needle)
  );
}

function dedupeResults(results: SearchResult[]) {
  return results.filter(
    (company, index, all) => all.findIndex((item) => item.ticker === company.ticker && item.exchange === company.exchange) === index
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();

  if (!query) {
    return NextResponse.json({
      results: starterCompanies,
      source: "starter",
      message: "Type a symbol or company name to search the IMRS starter directory."
    });
  }

  const starterMatches = starterSearch(query);
  return NextResponse.json({
    results: dedupeResults(starterMatches),
    source: "starter",
    message: starterMatches.length ? "Showing IMRS starter directory matches." : "No starter match found. Create the company manually, then sync evidence from Data."
  });
}
