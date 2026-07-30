import { NextResponse } from "next/server";
import { connectTrendlyneMcp, trendlyneConfigStatus } from "../mcp";

export const runtime = "nodejs";

export async function GET() {
  const config = trendlyneConfigStatus();

  if (!config.urlConfigured) {
    return NextResponse.json({
      ...config,
      connected: false,
      message: "Add TRENDLYNE_MCP_URL in Vercel to enable Trendlyne MCP."
    });
  }

  try {
    const connection = await connectTrendlyneMcp();
    const tools = await connection.client.listTools();
    await connection.transport.close();

    return NextResponse.json({
      ...config,
      connected: true,
      transport: connection.transportType,
      toolCount: tools.tools.length,
      tools: tools.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || ""
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...config,
        connected: false,
        error: error instanceof Error ? error.message : "Trendlyne MCP connection failed."
      },
      { status: 502 }
    );
  }
}
