import { NextRequest, NextResponse } from "next/server";
import { connectTrendlyneMcp, TrendlyneMcpClient } from "../mcp";

export const runtime = "nodejs";

type TrendlyneRecord = {
  id: string;
  companyName: string;
  ticker: string;
  source: string;
  importedAt: string;
  reportDate: string;
  marketCap: string;
  revenue: string;
  profit: string;
  eps: string;
  pe: string;
  roe: string;
  roce: string;
  debtEquity: string;
  salesGrowth: string;
  profitGrowth: string;
  opm: string;
  cfo: string;
  currentPrice: string;
  fiiHolding: string;
  diiHolding: string;
  institutionalHolding: string;
  dvmDurability: string;
  dvmValuation: string;
  dvmMomentum: string;
  analystScore: string;
};

type SearchEntity = {
  name?: string;
  nse_code?: string | null;
  bse_code?: string | null;
  isin?: string | null;
  sector?: string | null;
  industry?: string | null;
};

const fieldAliases: Record<keyof Omit<TrendlyneRecord, "id" | "source" | "importedAt" | "reportDate">, string[]> = {
  companyName: ["company name", "stock name", "name"],
  ticker: ["nse code", "nse symbol", "symbol", "ticker"],
  marketCap: ["market cap", "market capitalization", "mcap"],
  revenue: ["revenue", "sales", "net sales", "total income"],
  profit: ["net profit", "profit after tax", "pat", "profit"],
  eps: ["eps", "earnings per share"],
  pe: ["pe", "p/e", "price to earnings", "price earnings"],
  roe: ["roe", "return on equity"],
  roce: ["roce", "return on capital employed"],
  debtEquity: ["debt/equity", "debt equity", "debt to equity", "d/e"],
  salesGrowth: ["sales growth", "revenue growth"],
  profitGrowth: ["profit growth", "pat growth", "net profit growth"],
  opm: ["opm", "operating margin", "operating profit margin"],
  cfo: ["operating cash flow", "cash from operations", "cash flow from operations", "cfo"],
  currentPrice: ["current price", "price", "ltp", "last traded price"],
  fiiHolding: ["fii", "fii holding", "foreign institutional"],
  diiHolding: ["dii", "dii holding", "domestic institutional"],
  institutionalHolding: ["institutional holding", "institutional", "institutions", "total institutions"],
  dvmDurability: ["durability", "dvm durability", "durability score"],
  dvmValuation: ["valuation", "dvm valuation", "valuation score"],
  dvmMomentum: ["momentum", "dvm momentum", "momentum score"],
  analystScore: ["analyst", "analyst score", "analyst rating", "broker score", "forecaster"]
};

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\blimited\b|\bltd\b|\bindia\b|[^a-z0-9]/g, "")
    .trim();
}

function formatNumber(value: number | string | null | undefined, decimals = 2) {
  const numberValue = typeof value === "number" ? value : Number(String(value || "").replace(/[,₹%]/g, ""));
  if (!Number.isFinite(numberValue)) return "";
  const fixed = numberValue.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "");
}

function cleanValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "-" || /^na$/i.test(trimmed)) return "";
    return formatNumber(trimmed) || trimmed;
  }
  return "";
}

function toolText(result: unknown) {
  const content = (result as { content?: Array<{ type?: string; text?: string }> }).content || [];
  return content
    .map((item) => (item.type === "text" || item.text ? item.text || "" : ""))
    .filter(Boolean)
    .join("\n");
}

function parseJsonish(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return text;
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstObject = trimmed.indexOf("{");
    const lastObject = trimmed.lastIndexOf("}");
    if (firstObject >= 0 && lastObject > firstObject) {
      try {
        return JSON.parse(trimmed.slice(firstObject, lastObject + 1));
      } catch {
        return text;
      }
    }
    const firstArray = trimmed.indexOf("[");
    const lastArray = trimmed.lastIndexOf("]");
    if (firstArray >= 0 && lastArray > firstArray) {
      try {
        return JSON.parse(trimmed.slice(firstArray, lastArray + 1));
      } catch {
        return text;
      }
    }
    return text;
  }
}

function flatten(value: unknown, prefix = "", output: Array<{ path: string; value: string }> = []) {
  if (value === null || value === undefined) return output;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.push({ path: prefix, value: String(value) });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, output));
    return output;
  }
  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key, output));
  }
  return output;
}

function findByAlias(sources: unknown[], aliases: string[]) {
  for (const source of sources) {
    const pairs = flatten(source);
    const direct = pairs.find((pair) => aliases.some((alias) => normalizeKey(pair.path).includes(normalizeKey(alias))));
    if (direct) return cleanValue(direct.value);
  }
  return "";
}

function regexPick(text: string, aliases: string[]) {
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`${escaped}[^0-9\\-]{0,40}(-?\\d[\\d,.]*\\.?\\d*)\\s*%?`, "i").exec(text);
    if (match) return cleanValue(match[1]);
  }
  return "";
}

function fieldValue(sources: unknown[], text: string, field: keyof typeof fieldAliases) {
  return findByAlias(sources, fieldAliases[field]) || regexPick(text, fieldAliases[field]);
}

async function callTrendlyneTool(client: TrendlyneMcpClient, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const text = toolText(result);
  return {
    name,
    args,
    text,
    data: parseJsonish(text)
  };
}

function findEntity(data: unknown, query: string): SearchEntity | undefined {
  const parsed = typeof data === "string" ? parseJsonish(data) : data;
  const rows =
    (parsed as { data?: SearchEntity[] })?.data ||
    (Array.isArray(parsed) ? (parsed as SearchEntity[]) : undefined) ||
    [];

  return (
    rows.find((row) => row.nse_code && normalizeKey(row.nse_code) === normalizeKey(query)) ||
    rows.find((row) => row.name && normalizeKey(row.name).includes(normalizeKey(query))) ||
    rows[0]
  );
}

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required." }, { status: 400 });
  }

  let connection: Awaited<ReturnType<typeof connectTrendlyneMcp>> | undefined;

  try {
    connection = await connectTrendlyneMcp();
    const client = connection.client;

    const entityCall = await callTrendlyneTool(client, "search_entities", {
      query: symbol,
      entity_type: "stock",
      limit: 5
    });
    const entity = findEntity(entityCall.data, symbol);
    const stockCode = entity?.nse_code || entity?.bse_code || entity?.isin || symbol;

    const [parametersCall, ownershipCall, overviewCall] = await Promise.all([
      callTrendlyneTool(client, "get_parameter_values_multi_stock", {
        query:
          `${stockCode} latest market cap revenue net profit EPS PE ratio ROE ROCE debt to equity ` +
          "operating cash flow sales growth profit growth operating profit margin DVM durability valuation momentum analyst score",
        type: "stock"
      }),
      callTrendlyneTool(client, "get_ownership_deals_insider_sast", {
        stock_code: stockCode,
        type: "shareholding"
      }),
      callTrendlyneTool(client, "get_overview_news_corp_events", {
        stock_code: stockCode,
        type: "overview"
      })
    ]);

    const sources = [parametersCall.data, ownershipCall.data, overviewCall.data, entityCall.data];
    const allText = [parametersCall.text, ownershipCall.text, overviewCall.text, entityCall.text].join("\n");
    const record: TrendlyneRecord = {
      id: uid(),
      companyName: entity?.name || fieldValue(sources, allText, "companyName") || symbol,
      ticker: entity?.nse_code || symbol,
      source: "Trendlyne MCP",
      importedAt: new Date().toISOString(),
      reportDate: "Latest",
      marketCap: fieldValue(sources, allText, "marketCap"),
      revenue: fieldValue(sources, allText, "revenue"),
      profit: fieldValue(sources, allText, "profit"),
      eps: fieldValue(sources, allText, "eps"),
      pe: fieldValue(sources, allText, "pe"),
      roe: fieldValue(sources, allText, "roe"),
      roce: fieldValue(sources, allText, "roce"),
      debtEquity: fieldValue(sources, allText, "debtEquity"),
      salesGrowth: fieldValue(sources, allText, "salesGrowth"),
      profitGrowth: fieldValue(sources, allText, "profitGrowth"),
      opm: fieldValue(sources, allText, "opm"),
      cfo: fieldValue(sources, allText, "cfo"),
      currentPrice: fieldValue(sources, allText, "currentPrice"),
      fiiHolding: fieldValue(sources, allText, "fiiHolding"),
      diiHolding: fieldValue(sources, allText, "diiHolding"),
      institutionalHolding: fieldValue(sources, allText, "institutionalHolding"),
      dvmDurability: fieldValue(sources, allText, "dvmDurability"),
      dvmValuation: fieldValue(sources, allText, "dvmValuation"),
      dvmMomentum: fieldValue(sources, allText, "dvmMomentum"),
      analystScore: fieldValue(sources, allText, "analystScore")
    };

    return NextResponse.json({
      record,
      entity,
      transport: connection.transportType,
      raw: {
        parameters: parametersCall.data,
        ownership: ownershipCall.data,
        overview: overviewCall.data
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trendlyne MCP sync failed." },
      { status: 502 }
    );
  } finally {
    await connection?.transport.close().catch(() => undefined);
  }
}
