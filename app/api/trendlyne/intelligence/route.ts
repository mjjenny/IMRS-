import { NextRequest, NextResponse } from "next/server";
import { connectTrendlyneMcp, TrendlyneMcpClient } from "../mcp";

export const runtime = "nodejs";

function trimText(value: string, max = 3500) {
  return value.length > max ? `${value.slice(0, max).trim()}\n...` : value;
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
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "string" ? parseJsonish(parsed) : parsed;
  } catch {
    return text;
  }
}

function stringifySource(source: unknown): string {
  if (source === null || source === undefined) return "";
  if (typeof source === "string") {
    const parsed = parseJsonish(source);
    return typeof parsed === "string" ? parsed : stringifySource(parsed);
  }
  if (typeof source === "object" && "markdown_data" in source) {
    return stringifySource((source as { markdown_data?: unknown }).markdown_data);
  }
  return JSON.stringify(source, null, 2);
}

async function callTrendlyneTool(client: TrendlyneMcpClient, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const text = toolText(result);
  const data = parseJsonish(text);
  return {
    name,
    args,
    text: trimText(stringifySource(data) || text),
    data
  };
}

function findEntityText(text: string, symbol: string) {
  const line =
    text
      .split(/\r?\n/)
      .find((item) => item.toUpperCase().includes(`|${symbol.toUpperCase()}|`)) || "";
  const parts = line.split("|").map((part) => part.trim());
  return {
    companyName: parts[1] || symbol,
    ticker: parts[2] || symbol,
    bseCode: parts[3] || "",
    asOf: parts[4] || ""
  };
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
    const entity = findEntityText(entityCall.text, symbol);
    const stockCode = entity.ticker || symbol;
    const companyName = entity.companyName || symbol;

    const [overview, technical, news, events, shareholding, sast, bulkBlock, documents] = await Promise.all([
      callTrendlyneTool(client, "get_overview_news_corp_events", { stock_code: stockCode, type: "overview" }),
      callTrendlyneTool(client, "get_overview_news_corp_events", { stock_code: stockCode, type: "technical" }),
      callTrendlyneTool(client, "get_overview_news_corp_events", { stock_code: stockCode, type: "news" }),
      callTrendlyneTool(client, "get_overview_news_corp_events", { stock_code: stockCode, type: "events" }),
      callTrendlyneTool(client, "get_ownership_deals_insider_sast", { stock_code: stockCode, type: "shareholding" }),
      callTrendlyneTool(client, "get_ownership_deals_insider_sast", { stock_code: stockCode, type: "sast" }),
      callTrendlyneTool(client, "get_ownership_deals_insider_sast", { stock_code: stockCode, type: "bulblockdeal" }),
      callTrendlyneTool(client, "get_document_search_results", {
        query: `${companyName} annual report quarterly results earnings call management commentary growth risks debt margin`
      })
    ]);

    return NextResponse.json({
      record: {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        companyName,
        ticker: stockCode,
        source: "Trendlyne MCP",
        importedAt: new Date().toISOString(),
        transport: connection.transportType,
        overview: overview.text,
        technical: technical.text,
        news: news.text,
        events: events.text,
        shareholding: shareholding.text,
        sast: sast.text,
        bulkBlock: bulkBlock.text,
        documents: documents.text
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trendlyne MCP intelligence sync failed." },
      { status: 502 }
    );
  } finally {
    await connection?.transport.close().catch(() => undefined);
  }
}
