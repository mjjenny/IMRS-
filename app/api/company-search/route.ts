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

type UniverseRow = {
  symbol: string;
  name: string;
  series: string;
  listingDate: string;
  isin: string;
};

const NSE_UNIVERSE_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";
const UNIVERSE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 20;

let universeCache: { rows: UniverseRow[]; fetchedAt: number } | null = null;

const starterNotes: Record<string, { sector: string; note: string }> = {
  CDSL: { sector: "Capital Markets", note: "Depository infrastructure and capital-market participation play." },
  DIXON: { sector: "Electronics Manufacturing Services", note: "EMS scale, import substitution and manufacturing outsourcing theme." },
  HAL: { sector: "Defence Aerospace", note: "Defence order book and domestic aerospace capability compounder." },
  TRENT: { sector: "Retail", note: "Retail format execution, Zudio growth and operating leverage story." },
  KAYNES: { sector: "Electronics Manufacturing Services", note: "High-growth EMS and industrial electronics platform." },
  KPITTECH: { sector: "Auto Software", note: "Software-defined vehicle and automotive engineering services specialist." }
};

function blankResult(): Omit<SearchResult, "name" | "ticker" | "exchange" | "sector" | "note" | "source"> {
  return {
    marketCap: "",
    currentPrice: "",
    pe: "",
    roe: "",
    roce: "",
    salesGrowth: "",
    profitGrowth: "",
    debtEquity: "",
    promoterHolding: ""
  };
}

function starterCompanies(): SearchResult[] {
  const names: Record<string, string> = {
    CDSL: "Central Depository Services (India) Ltd",
    DIXON: "Dixon Technologies (India) Ltd",
    HAL: "Hindustan Aeronautics Ltd",
    TRENT: "Trent Ltd",
    KAYNES: "Kaynes Technology India Ltd",
    KPITTECH: "KPIT Technologies Ltd"
  };
  return Object.entries(names).map(([ticker, name]) => ({
    ...blankResult(),
    name,
    ticker,
    exchange: "NSE",
    sector: starterNotes[ticker]?.sector || "",
    note: starterNotes[ticker]?.note || "",
    source: "IMRS starter directory"
  }));
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseUniverseCsv(text: string): UniverseRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toUpperCase());
  const symbolIndex = headers.indexOf("SYMBOL");
  const nameIndex = headers.findIndex((header) => header.includes("NAME OF COMPANY"));
  const seriesIndex = headers.findIndex((header) => header.includes("SERIES"));
  const listingIndex = headers.findIndex((header) => header.includes("DATE OF LISTING"));
  const isinIndex = headers.findIndex((header) => header.includes("ISIN"));
  if (symbolIndex === -1 || nameIndex === -1) return [];

  return lines
    .slice(1)
    .map(parseCsvLine)
    .filter((cells) => cells[symbolIndex] && cells[nameIndex])
    .map((cells) => ({
      symbol: cells[symbolIndex].toUpperCase(),
      name: cells[nameIndex],
      series: seriesIndex >= 0 ? (cells[seriesIndex] || "").toUpperCase() : "",
      listingDate: listingIndex >= 0 ? cells[listingIndex] || "" : "",
      isin: isinIndex >= 0 ? cells[isinIndex] || "" : ""
    }))
    .filter((row) => !row.series || ["EQ", "BE", "BZ"].includes(row.series));
}

async function loadUniverse(): Promise<UniverseRow[]> {
  if (universeCache && Date.now() - universeCache.fetchedAt < UNIVERSE_TTL_MS) {
    return universeCache.rows;
  }

  const response = await fetch(NSE_UNIVERSE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "text/csv,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.nseindia.com/"
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`NSE equity universe fetch failed with ${response.status}`);

  const rows = parseUniverseCsv(await response.text());
  if (!rows.length) throw new Error("NSE equity universe returned no parseable rows.");

  universeCache = { rows, fetchedAt: Date.now() };
  return rows;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function rankMatch(row: UniverseRow, query: string) {
  const symbol = row.symbol.toLowerCase();
  const name = normalize(row.name);
  const needle = normalize(query);
  if (!needle) return -1;
  if (symbol === needle) return 0;
  if (symbol.startsWith(needle)) return 1;
  if (name.startsWith(needle)) return 2;
  if (name.split(" ").some((word) => word.startsWith(needle))) return 3;
  if (symbol.includes(needle)) return 4;
  if (name.includes(needle)) return 5;
  return -1;
}

function toResult(row: UniverseRow): SearchResult {
  const curated = starterNotes[row.symbol];
  return {
    ...blankResult(),
    name: row.name,
    ticker: row.symbol,
    exchange: "NSE",
    sector: curated?.sector || "",
    note:
      curated?.note ||
      [`NSE ${row.series || "EQ"} series`, row.listingDate ? `listed ${row.listingDate}` : "", row.isin].filter(Boolean).join(" - "),
    source: "NSE equity universe"
  };
}

function searchUniverse(rows: UniverseRow[], query: string) {
  return rows
    .map((row) => ({ row, rank: rankMatch(row, query) }))
    .filter((item) => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.row.symbol.localeCompare(b.row.symbol))
    .slice(0, MAX_RESULTS)
    .map((item) => toResult(item.row));
}

function starterSearch(query: string) {
  const needle = query.toLowerCase();
  return starterCompanies().filter((company) =>
    `${company.name} ${company.ticker} ${company.sector}`.toLowerCase().includes(needle)
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();

  if (!query) {
    return NextResponse.json({
      results: starterCompanies(),
      source: "starter",
      message: "Type a symbol or company name to search all NSE-listed companies."
    });
  }

  try {
    const rows = await loadUniverse();
    const results = searchUniverse(rows, query);
    return NextResponse.json({
      results,
      source: "nse-universe",
      message: results.length
        ? `Showing ${results.length} match${results.length > 1 ? "es" : ""} from ${rows.length} NSE-listed companies. Import one, then sync evidence from Data.`
        : `No match in ${rows.length} NSE-listed companies. Check the spelling or create the company manually.`
    });
  } catch {
    const starterMatches = starterSearch(query);
    return NextResponse.json({
      results: starterMatches,
      source: "starter-fallback",
      message: starterMatches.length
        ? "Full company directory is temporarily unavailable; showing starter matches."
        : "Full company directory is temporarily unavailable. Create the company manually, then sync evidence from Data."
    });
  }
}
