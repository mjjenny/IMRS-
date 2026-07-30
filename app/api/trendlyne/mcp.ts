import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type TrendlyneConnection = {
  client: Client;
  transport: StreamableHTTPClientTransport | SSEClientTransport;
  transportType: "streamable-http" | "sse";
};

function trendlyneHeaders() {
  const token = process.env.TRENDLYNE_MCP_TOKEN;
  const apiKey = process.env.TRENDLYNE_MCP_API_KEY;
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  if (apiKey) headers["x-api-key"] = apiKey;

  return headers;
}

export function trendlyneConfigured() {
  return Boolean(process.env.TRENDLYNE_MCP_URL);
}

export function trendlyneConfigStatus() {
  return {
    urlConfigured: Boolean(process.env.TRENDLYNE_MCP_URL),
    tokenConfigured: Boolean(process.env.TRENDLYNE_MCP_TOKEN),
    apiKeyConfigured: Boolean(process.env.TRENDLYNE_MCP_API_KEY)
  };
}

export async function connectTrendlyneMcp(): Promise<TrendlyneConnection> {
  const url = process.env.TRENDLYNE_MCP_URL;
  if (!url) throw new Error("TRENDLYNE_MCP_URL is not configured.");

  const requestInit = { headers: trendlyneHeaders() };
  const baseUrl = new URL(url);

  const client = new Client({ name: "imrs-enterprise", version: "0.3.0" });
  const streamableTransport = new StreamableHTTPClientTransport(baseUrl, { requestInit });

  try {
    await client.connect(streamableTransport);
    return { client, transport: streamableTransport, transportType: "streamable-http" };
  } catch (streamableError) {
    await streamableTransport.close().catch(() => undefined);

    const sseClient = new Client({ name: "imrs-enterprise", version: "0.3.0" });
    const sseTransport = new SSEClientTransport(baseUrl, {
      requestInit,
      eventSourceInit: { fetch: (url, init) => fetch(url, { ...init, headers: requestInit.headers }) }
    });

    try {
      await sseClient.connect(sseTransport);
      return { client: sseClient, transport: sseTransport, transportType: "sse" };
    } catch (sseError) {
      await sseTransport.close().catch(() => undefined);
      throw new Error(
        `Trendlyne MCP connection failed. Streamable HTTP: ${
          streamableError instanceof Error ? streamableError.message : String(streamableError)
        }. SSE: ${sseError instanceof Error ? sseError.message : String(sseError)}.`
      );
    }
  }
}
