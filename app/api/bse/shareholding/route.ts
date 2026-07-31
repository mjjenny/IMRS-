import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type BseShareholdingHistoryRow = {
  qtr?: string;
  qtrid?: string | number;
  filing_date_time?: string;
  revised_date_time?: string | null;
  xbrlurl?: string;
  XbrlFile?: string;
};

type BseShareholdingCategoryRow = {
  Fld_Code?: string;
  Fld_ShortName?: string;
  Fld_ShortCatg?: string;
  Fld_TotalPercentageOf_A_B_C2?: string | number;
};

type BseShareholdingDeclaration = {
  CompName?: string;
  qtr_name?: string;
};

type BseHeader = {
  SecurityId?: string;
};

const BSE_API = "https://api.bseindia.com/BseIndiaAPI/api";
const BSE_ORIGIN = "https://www.bseindia.com";

function clean(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function formatPercent(value: string | number | null | undefined) {
  const numberValue = Number(clean(value).replace(/,/g, ""));
  if (!Number.isFinite(numberValue)) return "";
  return numberValue.toFixed(2).replace(/\.?0+$/, "");
}

function absoluteBseUrl(value = "") {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${BSE_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
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
    throw new Error(`BSE shareholding failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function categoryMatch(row: BseShareholdingCategoryRow, patterns: RegExp[]) {
  const label = `${row.Fld_Code || ""} ${row.Fld_ShortName || ""} ${row.Fld_ShortCatg || ""}`;
  return patterns.some((pattern) => pattern.test(label));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || url.searchParams.get("scripcode") || "").trim();

  if (!code) {
    return NextResponse.json({ error: "BSE code is required." }, { status: 400 });
  }

  try {
    const [historyPayload, categoryPayload, declarationPayload, headerPayload] = await Promise.all([
      bseJson<{ Table?: BseShareholdingHistoryRow[] }>("/SHPQNewFormat/w", { scripcode: code }),
      bseJson<{ Table1?: BseShareholdingCategoryRow[] }>("/CorporatesSHPSecuritybeta/w", {
        scripcode: code,
        qtrid: ""
      }),
      bseJson<{ Table?: BseShareholdingDeclaration[] }>("/shpDecleraction/w", { scripcode: code, qtrid: "" }).catch(
        () => ({ Table: [] })
      ),
      bseJson<BseHeader>("/ComHeadernew/w", { quotetype: "EQ", scripcode: code, seriesid: "" }).catch(
        (): BseHeader => ({})
      )
    ]);
    const historyRows = Array.isArray(historyPayload.Table) ? historyPayload.Table : [];
    const categoryRows = Array.isArray(categoryPayload.Table1) ? categoryPayload.Table1 : [];
    const latest = historyRows[0];
    const declaration = Array.isArray(declarationPayload.Table) ? declarationPayload.Table[0] : undefined;
    const promoter = categoryRows.find((row) => categoryMatch(row, [/STA1A/i, /promoter/i]));
    const publicRow = categoryRows.find((row) => categoryMatch(row, [/^STB/i, /\(B\)\s*Public/i, /\bpublic\b/i]));
    const employeeTrusts = categoryRows.find((row) => categoryMatch(row, [/STC2/i, /employee trust/i]));
    const companyName = clean(declaration?.CompName) || clean(headerPayload.SecurityId) || `BSE ${code}`;
    const asOnDate = clean(latest?.qtr) || clean(declaration?.qtr_name);

    if (!latest && !categoryRows.length) {
      return NextResponse.json({ error: "No BSE shareholding record found." }, { status: 404 });
    }

    return NextResponse.json({
      record: {
        id: crypto.randomUUID(),
        companyName,
        ticker: code,
        source: "BSE shareholding API",
        importedAt: new Date().toISOString(),
        asOnDate,
        submissionDate: clean(latest?.filing_date_time || latest?.revised_date_time),
        promoterHolding: formatPercent(promoter?.Fld_TotalPercentageOf_A_B_C2),
        publicHolding: formatPercent(publicRow?.Fld_TotalPercentageOf_A_B_C2),
        employeeTrusts: formatPercent(employeeTrusts?.Fld_TotalPercentageOf_A_B_C2),
        xbrlUrl: absoluteBseUrl(latest?.xbrlurl || latest?.XbrlFile || ""),
        history: historyRows.slice(0, 8).map((row, index) => ({
          asOnDate: clean(row.qtr),
          promoterHolding: index === 0 ? formatPercent(promoter?.Fld_TotalPercentageOf_A_B_C2) : "",
          publicHolding: index === 0 ? formatPercent(publicRow?.Fld_TotalPercentageOf_A_B_C2) : "",
          employeeTrusts: index === 0 ? formatPercent(employeeTrusts?.Fld_TotalPercentageOf_A_B_C2) : "",
          submissionDate: clean(row.filing_date_time || row.revised_date_time),
          xbrlUrl: absoluteBseUrl(row.xbrlurl || row.XbrlFile || "")
        }))
      }
    });
  } catch {
    return NextResponse.json({ error: "BSE shareholding fetch failed." }, { status: 502 });
  }
}
