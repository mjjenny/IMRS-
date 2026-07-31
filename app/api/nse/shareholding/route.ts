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

function cleanPercent(value: string | null | undefined) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  if (!cleaned) return "";
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(2).replace(/\.?0+$/, "");
}

function positivePercent(value: string | null | undefined) {
  const formatted = cleanPercent(value);
  const parsed = Number(formatted);
  return parsed > 0 && parsed <= 100 ? formatted : "";
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
    promoterHolding: positivePercent(latest.pr_and_prgrp),
    publicHolding: cleanPercent(latest.public_val),
    employeeTrusts: cleanPercent(latest.employeeTrusts),
    xbrlUrl: latest.xbrl || "",
    history: rows.map((row) => ({
      asOnDate: row.date || "",
      promoterHolding: positivePercent(row.pr_and_prgrp),
      publicHolding: cleanPercent(row.public_val),
      employeeTrusts: cleanPercent(row.employeeTrusts),
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
