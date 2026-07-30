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

type KiteInstrument = {
  instrument_token: string;
  exchange_token: string;
  tradingsymbol: string;
  name: string;
  last_price: string;
  expiry: string;
  strike: string;
  tick_size: string;
  lot_size: string;
  instrument_type: string;
  segment: string;
  exchange: string;
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

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function parseKiteInstruments(csv: string): KiteInstrument[] {
  const lines = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])) as KiteInstrument;
  });
}

function starterSearch(query: string) {
  const needle = query.toLowerCase();
  return starterCompanies.filter((company) =>
    `${company.name} ${company.ticker} ${company.sector}`.toLowerCase().includes(needle)
  );
}

function normalizeKiteInstrument(instrument: KiteInstrument): SearchResult {
  return {
    name: instrument.name || instrument.tradingsymbol,
    ticker: instrument.tradingsymbol,
    exchange: instrument.exchange,
    sector: "Equity",
    marketCap: "",
    currentPrice: "",
    pe: "",
    roe: "",
    roce: "",
    salesGrowth: "",
    profitGrowth: "",
    debtEquity: "",
    promoterHolding: "",
    note: `Instrument token ${instrument.instrument_token}. Segment ${instrument.segment}.`,
    source: "Kite Connect instruments"
  };
}

async function fetchKiteInstruments(query: string) {
  const response = await fetch("https://api.kite.trade/instruments", {
    next: { revalidate: 60 * 60 * 12 }
  });

  if (!response.ok) {
    throw new Error(`Kite instruments failed with ${response.status}`);
  }

  const instruments = parseKiteInstruments(await response.text());
  const needle = query.toLowerCase();

  return instruments
    .filter((instrument) => ["NSE", "BSE"].includes(instrument.exchange))
    .filter((instrument) => instrument.instrument_type === "EQ")
    .filter((instrument) => `${instrument.name} ${instrument.tradingsymbol}`.toLowerCase().includes(needle))
    .sort((a, b) => relevanceScore(b, needle) - relevanceScore(a, needle))
    .slice(0, 15)
    .map(normalizeKiteInstrument);
}

function relevanceScore(instrument: KiteInstrument, needle: string) {
  const symbol = instrument.tradingsymbol.toLowerCase();
  const name = instrument.name.toLowerCase();
  let scoreValue = 0;

  if (symbol === needle) scoreValue += 1000;
  if (symbol.startsWith(needle)) scoreValue += 500;
  if (name === needle) scoreValue += 250;
  if (name.startsWith(needle)) scoreValue += 150;
  if (instrument.exchange === "NSE") scoreValue += 25;
  if (symbol.includes(needle)) scoreValue += 10;
  if (name.includes(needle)) scoreValue += 5;

  return scoreValue;
}

async function attachKiteLtp(results: SearchResult[]) {
  const apiKey = process.env.KITE_API_KEY;
  const accessToken = process.env.KITE_ACCESS_TOKEN;

  if (!apiKey || !accessToken || results.length === 0) {
    return {
      results,
      message: "Kite instrument search is active. Add KITE_API_KEY and today's KITE_ACCESS_TOKEN in Vercel to enable live LTP."
    };
  }

  const params = new URLSearchParams();
  results.slice(0, 10).forEach((company) => params.append("i", `${company.exchange}:${company.ticker}`));

  const response = await fetch(`https://api.kite.trade/quote/ltp?${params}`, {
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${apiKey}:${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return {
      results,
      message: "Kite search worked, but LTP fetch failed. Refresh the daily Kite access token if it has expired."
    };
  }

  const payload = await response.json();
  const quoteData = payload?.data || {};

  return {
    results: results.map((company) => {
      const ltp = quoteData[`${company.exchange}:${company.ticker}`]?.last_price;
      return {
        ...company,
        currentPrice: ltp ? String(ltp) : company.currentPrice,
        source: ltp ? "Kite Connect instruments + LTP" : company.source
      };
    }),
    message: "Showing Kite Connect instrument results with live LTP where available."
  };
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
      message: "Type a symbol or company name to search Kite Connect instruments."
    });
  }

  const starterMatches = starterSearch(query);

  try {
    const kiteMatches = await fetchKiteInstruments(query);
    const withLtp = await attachKiteLtp(dedupeResults([...starterMatches, ...kiteMatches]));

    return NextResponse.json({
      results: withLtp.results,
      source: "kite",
      message: withLtp.message
    });
  } catch {
    return NextResponse.json({
      results: starterMatches,
      source: "starter",
      message: "Kite instrument search failed. Showing starter directory matches."
    });
  }
}
