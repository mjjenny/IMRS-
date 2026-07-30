import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type NseShareholdingRow = {
  broadcastDate?: string;
  date?: string;
  employeeTrusts?: string;
  name?: string;
  pr_and_prgrp?: string;
  public_val?: string;
  submissionDate?: string;
  symbol?: string;
  xbrl?: string;
};

const NSE_PAGE = "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern";

function cookieHeader(response: Response) {
  const cookie = response.headers.get("set-cookie") || "";
  return cookie
    .split(/,(?=[^;,]+=)/)
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function normalizeRecord(rows: NseShareholdingRow[], symbol: string) {
  const latest = rows[0];
  if (!latest) return null;

  return {
    id: crypto.randomUUID(),
    companyName: latest.name || symbol,
    ticker: latest.symbol || symbol,
    source: "NSE shareholding API",
    importedAt: new Date().toISOString(),
    asOnDate: latest.date || "",
    submissionDate: latest.submissionDate || "",
    promoterHolding: latest.pr_and_prgrp || "",
    publicHolding: latest.public_val || "",
    employeeTrusts: latest.employeeTrusts || "",
    xbrlUrl: latest.xbrl || "",
    history: rows.map((row) => ({
      asOnDate: row.date || "",
      promoterHolding: row.pr_and_prgrp || "",
      publicHolding: row.public_val || "",
      employeeTrusts: row.employeeTrusts || "",
      submissionDate: row.submissionDate || "",
      xbrlUrl: row.xbrl || ""
    }))
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required." }, { status: 400 });
  }

  try {
    const pageResponse = await fetch(`${NSE_PAGE}?symbol=${encodeURIComponent(symbol)}&tabIndex=equity`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
        Referer: "https://www.nseindia.com/"
      },
      cache: "no-store"
    });
    const cookies = cookieHeader(pageResponse);
    const apiResponse = await fetch(
      `https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol=${encodeURIComponent(symbol)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
          Referer: NSE_PAGE,
          ...(cookies ? { Cookie: cookies } : {})
        },
        cache: "no-store"
      }
    );

    if (!apiResponse.ok) {
      return NextResponse.json(
        { error: `NSE shareholding fetch failed with ${apiResponse.status}.` },
        { status: apiResponse.status }
      );
    }

    const rows = (await apiResponse.json()) as NseShareholdingRow[];
    const record = normalizeRecord(Array.isArray(rows) ? rows : [], symbol);

    if (!record) {
      return NextResponse.json({ error: "No NSE shareholding record found." }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch {
    return NextResponse.json({ error: "NSE shareholding fetch failed." }, { status: 502 });
  }
}
