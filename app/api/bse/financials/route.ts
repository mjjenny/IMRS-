import { NextResponse } from "next/server";
import {
  deriveMetrics,
  extractFromFilingText,
  fetchFilingText,
  mergeMetric,
  type FilingMetricKey
} from "../../lib/filing-extraction";

export const dynamic = "force-dynamic";

type BseHeader = {
  SecurityId?: string;
  SecurityCode?: string;
  ISIN?: string;
  Industry?: string;
  Sector?: string;
  EPS?: string | number;
  PE?: string | number;
  OPM?: string | number;
  NPM?: string | number;
  ROE?: string | number;
};

type BsePrice = {
  CurrVal?: string | number;
  PrevClose?: string | number;
};

const BSE_API = "https://api.bseindia.com/BseIndiaAPI/api";
const BSE_ORIGIN = "https://www.bseindia.com";

function clean(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function formatNumber(value: string | number | null | undefined, decimals = 2) {
  const numberValue = Number(clean(value).replace(/,/g, ""));
  if (!numberValue) return "";
  return numberValue.toFixed(decimals).replace(/\.?0+$/, "");
}

function absoluteBseUrl(value = "") {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${BSE_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

function stripHtml(value = "") {
  return clean(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
  );
}

async function bseJson<T>(path: string, params: Record<string, string>) {
  const url = new URL(`${BSE_API}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json, text/plain, */*",
      Origin: BSE_ORIGIN,
      Referer: `${BSE_ORIGIN}/`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`BSE financials failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function latestAnnualResult(data = "") {
  const rows = data.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows.slice(1)) {
    const cells = Array.from(row.matchAll(/<td[\s\S]*?<\/td>/gi)).map((match) => match[0]);
    if (cells.length < 2) continue;
    const year = stripHtml(cells[0]);
    const annualCell = cells.find((cell) => /Annual/i.test(stripHtml(cell))) || cells[cells.length - 1];
    const href = /href=["']([^"']+)["']/i.exec(annualCell)?.[1] || "";
    const label = stripHtml(annualCell);
    if (year || href || label) {
      return {
        year,
        reportDate: label.replace(/^Annual\s*/i, "").trim() || year,
        xbrlUrl: absoluteBseUrl(href)
      };
    }
  }

  return { year: "", reportDate: "", xbrlUrl: "" };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || url.searchParams.get("scripcode") || "").trim();

  if (!code) {
    return NextResponse.json({ error: "BSE code is required." }, { status: 400 });
  }

  try {
    const [header, price, result] = await Promise.all([
      bseJson<BseHeader>("/ComHeadernew/w", { quotetype: "EQ", scripcode: code, seriesid: "" }),
      bseJson<BsePrice>("/StockReachGraph/w", { scripcode: code, flag: "0", fromdate: "", todate: "", seriesid: "" }),
      bseJson<{ Data?: string }>("/FinancialResult/w", { Scripcode: code }).catch(() => ({ Data: "" }))
    ]);
    const annualResult = latestAnnualResult(result.Data || "");
    const companyLabel = clean(header.SecurityId) || `BSE ${code}`;
    const xbrlText = await fetchFilingText(annualResult.xbrlUrl);
    const filingExtraction = xbrlText
      ? extractFromFilingText(xbrlText, annualResult.reportDate || annualResult.year)
      : {
          period: annualResult.reportDate || annualResult.year,
          metrics: {} as Partial<Record<FilingMetricKey, never>>,
          warnings: ["No machine-readable filing text could be fetched from the BSE record."]
        };
    const metrics = filingExtraction.metrics;
    deriveMetrics(metrics, filingExtraction.period);

    return NextResponse.json({
      record: {
        id: crypto.randomUUID(),
        companyName: companyLabel,
        ticker: clean(header.SecurityId) || code,
        source: "BSE company header and result filings",
        importedAt: new Date().toISOString(),
        reportDate: annualResult.reportDate || annualResult.year,
        marketCap: "",
        revenue: mergeMetric("", metrics.revenue, 0),
        profit: mergeMetric("", metrics.profit, 0),
        eps: formatNumber(header.EPS),
        pe: formatNumber(header.PE),
        roe: formatNumber(header.ROE),
        roce: "",
        debtEquity: mergeMetric("", metrics.debtEquity),
        promoterHolding: "",
        salesGrowth: "",
        profitGrowth: "",
        opm: mergeMetric(formatNumber(header.OPM), metrics.opm),
        cfo: mergeMetric("", metrics.cfo, 0),
        currentPrice: formatNumber(price.CurrVal),
        fiiHolding: "",
        diiHolding: "",
        institutionalHolding: "",
        dvmDurability: "",
        dvmValuation: "",
        dvmMomentum: "",
        analystScore: "",
        filingDate: annualResult.year,
        xbrlUrl: annualResult.xbrlUrl,
        financialYear: annualResult.year,
        industry: clean(header.Industry),
        sector: clean(header.Sector),
        isin: clean(header.ISIN),
        bseCode: clean(header.SecurityCode) || code,
        filingEvidence: filingExtraction,
        extractionWarnings: filingExtraction.warnings,
        sourceQuality: {
          primary: "bse-header-and-filing",
          machineReadableFilingFetched: Boolean(xbrlText),
          metricCandidateCount: Object.keys(metrics).length
        }
      }
    });
  } catch {
    return NextResponse.json({ error: "BSE financials fetch failed." }, { status: 502 });
  }
}
