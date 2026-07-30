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
    marketCap: "33900",
    currentPrice: "1620",
    pe: "62",
    roe: "29",
    roce: "38",
    salesGrowth: "31",
    profitGrowth: "35",
    debtEquity: "0",
    promoterHolding: "15",
    note: "Depository infrastructure and capital-market participation play.",
    source: "IMRS starter directory"
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
    note: "EMS scale, import substitution and manufacturing outsourcing theme.",
    source: "IMRS starter directory"
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
    note: "Defence order book and domestic aerospace capability compounder.",
    source: "IMRS starter directory"
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
    note: "Retail format execution, Zudio growth and operating leverage story.",
    source: "IMRS starter directory"
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
    note: "High-growth EMS and industrial electronics platform.",
    source: "IMRS starter directory"
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
