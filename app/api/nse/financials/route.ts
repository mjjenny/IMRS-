import { NextResponse } from "next/server";
import {
  deriveMetrics,
  extractFromFilingText,
  fetchFilingText,
  formatMetric,
  lakhsToCrore,
  mergeCandidate,
  mergeMetric,
  metricCandidate,
  numericValue,
  type FilingMetricKey,
  type FilingMetricCandidate
} from "../../lib/filing-extraction";

export const dynamic = "force-dynamic";

type NseFinancialRow = {
  audited?: string;
  companyName?: string;
  consolidated?: string;
  filingDate?: string;
  financialYear?: string;
  format?: string;
  fromDate?: string;
  industry?: string;
  oldNewFlag?: string;
  params?: string;
  period?: string;
  reInd?: string;
  seqNumber?: string;
  symbol?: string;
  toDate?: string;
  xbrl?: string;
};

type ResultFields = Record<string, string | number | null | undefined>;

const NSE_PAGE = "https://www.nseindia.com/companies-listing/corporate-filings-financial-results";

function cookieHeader(response: Response) {
  const cookie = response.headers.get("set-cookie") || "";
  return cookie
    .split(/,(?=[^;,]+=)/)
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function parseDate(value = "") {
  const parsed = Date.parse(value.replace(/-/g, " "));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function nseFetch(url: string, cookies: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      Referer: NSE_PAGE,
      ...(cookies ? { Cookie: cookies } : {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`NSE financials failed with ${response.status}`);
  }

  return response.json();
}

async function fetchDetail(row: NseFinancialRow, cookies: string) {
  const params = new URLSearchParams({
    index: "equities",
    params: row.params || "",
    seq_id: row.seqNumber || "",
    industry: row.industry || "",
    frOldNewFlag: row.oldNewFlag || "",
    ind: row.reInd || "",
    format: row.format || ""
  });
  const detail = await nseFetch(`https://www.nseindia.com/api/corporates-financial-results-data?${params}`, cookies);
  return (detail?.resultsData2 || detail?.resultsData || {}) as ResultFields;
}

function lineItems(fields: ResultFields) {
  const revenue = lakhsToCrore(fields.re_net_sale || fields.re_total_inc);
  const profit = lakhsToCrore(fields.re_pl_own_par || fields.re_proloss_ord_act || fields.re_con_pro_loss);
  const operatingProfit = lakhsToCrore(fields.re_pro_bef_int_n_excep);
  const eps = numericValue(fields.re_basic_eps_for_cont_dic_opr || fields.re_bsc_eps_bfr_exi || fields.re_basic_eps);

  return {
    revenue,
    profit,
    operatingProfit,
    eps,
    opm: revenue ? (operatingProfit / revenue) * 100 : 0
  };
}

function apiCandidates(items: ReturnType<typeof lineItems>, period: string) {
  const metrics: Partial<Record<FilingMetricKey, FilingMetricCandidate>> = {};
  mergeCandidate(metrics, metricCandidate("revenue", "Revenue", items.revenue, "INR crore", period, "api-field", "high", "NSE financial result revenue"));
  mergeCandidate(metrics, metricCandidate("profit", "Net profit", items.profit, "INR crore", period, "api-field", "high", "NSE financial result profit"));
  mergeCandidate(metrics, metricCandidate("eps", "EPS", items.eps, "INR", period, "api-field", "high", "NSE financial result EPS"));
  mergeCandidate(metrics, metricCandidate("operatingProfit", "Operating profit", items.operatingProfit, "INR crore", period, "api-field", "medium", "NSE financial result operating profit"));
  deriveMetrics(metrics, period);
  return metrics;
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
    const rows = (await nseFetch(
      `https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=${encodeURIComponent(symbol)}&period=Annual`,
      cookies
    )) as NseFinancialRow[];
    const annualRows = (Array.isArray(rows) ? rows : [])
      .filter((row) => row.period === "Annual")
      .sort((a, b) => parseDate(b.toDate) - parseDate(a.toDate));
    const selectedRows = annualRows.filter((row) => row.consolidated === "Consolidated");
    const candidates = selectedRows.length ? selectedRows : annualRows;
    const latest = candidates[0];
    const prior = candidates.find((row) => row.toDate !== latest?.toDate);

    if (!latest) {
      return NextResponse.json({ error: "No NSE annual financial result found." }, { status: 404 });
    }

    const latestItems = lineItems(await fetchDetail(latest, cookies));
    const priorItems = prior ? lineItems(await fetchDetail(prior, cookies)) : undefined;
    const salesGrowth = priorItems?.revenue ? ((latestItems.revenue / priorItems.revenue) - 1) * 100 : 0;
    const profitGrowth = priorItems?.profit ? ((latestItems.profit / priorItems.profit) - 1) * 100 : 0;
    const period = latest.toDate || latest.financialYear || "";
    const xbrlText = await fetchFilingText(latest.xbrl || "");
    const filingExtraction = xbrlText
      ? extractFromFilingText(xbrlText, period)
      : { period, metrics: {}, warnings: ["No machine-readable filing text could be fetched from the NSE record."] };
    const metrics = { ...filingExtraction.metrics, ...apiCandidates(latestItems, period) };
    deriveMetrics(metrics, period);

    return NextResponse.json({
      record: {
        id: crypto.randomUUID(),
        companyName: latest.companyName || symbol,
        ticker: latest.symbol || symbol,
        source: "NSE annual financial results",
        importedAt: new Date().toISOString(),
        reportDate: period,
        marketCap: "",
        revenue: mergeMetric(formatMetric(latestItems.revenue, 0), metrics.revenue, 0),
        profit: mergeMetric(formatMetric(latestItems.profit, 0), metrics.profit, 0),
        eps: mergeMetric(formatMetric(latestItems.eps), metrics.eps),
        pe: "",
        roe: mergeMetric("", metrics.roe),
        roce: "",
        debtEquity: mergeMetric("", metrics.debtEquity),
        salesGrowth: salesGrowth ? formatMetric(salesGrowth) : "",
        profitGrowth: profitGrowth ? formatMetric(profitGrowth) : "",
        opm: mergeMetric(formatMetric(latestItems.opm), metrics.opm),
        cfo: mergeMetric("", metrics.cfo, 0),
        currentPrice: "",
        filingDate: latest.filingDate || "",
        xbrlUrl: latest.xbrl || "",
        financialYear: latest.financialYear || "",
        filingEvidence: { ...filingExtraction, metrics },
        extractionWarnings: filingExtraction.warnings,
        sourceQuality: {
          primary: "nse-api-fields",
          machineReadableFilingFetched: Boolean(xbrlText),
          metricCandidateCount: Object.keys(metrics).length
        }
      }
    });
  } catch {
    return NextResponse.json({ error: "NSE financials fetch failed." }, { status: 502 });
  }
}
