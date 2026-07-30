import { NextResponse } from "next/server";

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

function asNumber(value: string | number | null | undefined) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

function lakhsToCrore(value: string | number | null | undefined) {
  const numberValue = asNumber(value);
  return numberValue ? numberValue / 100 : 0;
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
  const eps = asNumber(fields.re_basic_eps_for_cont_dic_opr || fields.re_bsc_eps_bfr_exi || fields.re_basic_eps);

  return {
    revenue,
    profit,
    operatingProfit,
    eps,
    opm: revenue ? (operatingProfit / revenue) * 100 : 0
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

    return NextResponse.json({
      record: {
        id: crypto.randomUUID(),
        companyName: latest.companyName || symbol,
        ticker: latest.symbol || symbol,
        source: "NSE annual financial results",
        importedAt: new Date().toISOString(),
        reportDate: latest.toDate || latest.financialYear || "",
        marketCap: "",
        revenue: formatNumber(latestItems.revenue, 0),
        profit: formatNumber(latestItems.profit, 0),
        eps: formatNumber(latestItems.eps),
        pe: "",
        roe: "",
        roce: "",
        debtEquity: "",
        salesGrowth: salesGrowth ? formatNumber(salesGrowth) : "",
        profitGrowth: profitGrowth ? formatNumber(profitGrowth) : "",
        opm: latestItems.opm ? formatNumber(latestItems.opm) : "",
        cfo: "",
        currentPrice: "",
        filingDate: latest.filingDate || "",
        xbrlUrl: latest.xbrl || "",
        financialYear: latest.financialYear || ""
      }
    });
  } catch {
    return NextResponse.json({ error: "NSE financials fetch failed." }, { status: 502 });
  }
}
