import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ReportRequest = {
  company?: unknown;
  trendlyne?: unknown;
  fundamentals?: unknown;
  ruleBasedReport?: string;
};

function compactJson(value: unknown, max = 18000) {
  const text = JSON.stringify(value, null, 2);
  return text.length > max ? `${text.slice(0, max)}\n[truncated for model context]` : text;
}

function outputText(payload: unknown) {
  const direct = (payload as { output_text?: string }).output_text;
  if (direct) return direct;

  const output = (payload as { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> }).output || [];
  return output
    .flatMap((item) => item.content || [])
    .map((item) => item.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured in Vercel." }, { status: 400 });
  }

  const body = (await request.json()) as ReportRequest;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const prompt = `You are an institutional Indian public-equity analyst.

Write a clear stock research report from the supplied IMRS, Trendlyne, NSE and Kite data.

Rules:
- Do not give personal financial advice.
- Separate facts from assumptions.
- Do not invent missing figures.
- If source data is thin or contradictory, do not leave sections blank. Triangulate from available evidence, use labelled derived/proxy values where mathematically valid, then say exactly what must be fetched to close the gap.
- Use this source hierarchy: audited filings and exchange filings first, Trendlyne fundamentals/intelligence second, Kite price third, derived calculations fourth. Label the basis of every important conclusion.
- When raw metrics fail validation, use labelled proxies when possible: derive P/E from price/EPS, derive net margin from net profit/revenue, cross-check share count from market cap/price and profit/EPS. If a proxy is not possible, move the item to Needs verification and explain the exact source required.
- Business and industry sections must describe the actual business model, products/services, customers, end-markets, margin drivers, competitive position and growth runway. Never substitute ownership tables, technicals or raw MCP headers for business analysis.
- Focus on future prospects, multibagger potential and potential trap risk.
- Use plain analyst language, not raw JSON.
- Include these sections: Sanity check before verdict, Source coverage and reconciliation, Executive verdict, Business quality, Financial quality, Valuation, Growth runway, Ownership, Risks, Catalysts, Multibagger probability, Trap probability, Data confidence, Needs verification, Final recommendation, What must happen for 5x/10x, What would make this fail.
- Before generating the Executive Verdict, cross-reference core metrics for logical consistency. If an established blue-chip or large company shows a negative operating margin, unusually weak ROE/ROCE or a massive profit drop, explicitly ask whether there are exceptional/one-off items, base effects or data extraction errors. Apply a confidence penalty until this is resolved.
- Never output floating financial figures. Every revenue, EPS, growth, margin, cash-flow or ownership metric must be tied to a visible timeframe such as Q1 FY27, FY26 Annual, TTM, or Undated/Unverified. If the data lacks a date, write "Undated/Unverified" next to the number.
- When analyzing YoY profit or revenue declines, scan the supplied news, filings, corporate events and document-search text for exceptional items, base effects, one-off charges, impairments, accounting changes or transcript context before calling the company a value trap.
- Enforce units. Use INR crore, INR, %, x, or ratio labels. If a raw metric lacks unit context, especially cash-flow values like CFO = 7.5, suppress it from primary conclusions and place it under Needs verification.
- Reconcile EPS, P/E, current price, market cap and profit. Price divided by P/E should broadly match EPS, and market cap divided by price should broadly reconcile with profit divided by EPS. If not, flag possible bonus/split/stale EPS and withhold valuation confidence.
- If the issuer is above INR 500,000 crore market cap or is a diversified conglomerate, use a compounder/re-rating lens rather than a small-cap 5x/10x multibagger lens, and require segment analysis before a final verdict. Do not misclassify ordinary large caps as mega-caps.
- Valuation must never use negative P/E or negative implied target prices. If EPS or P/E is invalid, state that the scenario is invalid and rebuild from validated or derived inputs.
- Always provide a provisional investment view, source coverage map, confidence score and next evidence requests. A data gap lowers confidence; it should not turn the report into an empty refusal unless core share-basis math cannot be reconciled.
- Do not output Trap probability 100/100 or Multibagger probability 100/100. Use calibrated 5-95 ranges and explain the drivers. If two or more P0 data checks fail, write "Verdict withheld - data-quality gate failed."
- Never repeat raw Trendlyne payloads, table headers, OCR fragments, JSON-like dumps or truncated evidence blocks in the final report. Summarize clean evidence only and move messy source output to Needs verification.

Rule-based report:
${body.ruleBasedReport || "Not supplied."}

Company and source packet:
${compactJson({ company: body.company, fundamentals: body.fundamentals, trendlyne: body.trendlyne })}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 5200
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = (payload as { error?: { message?: string } }).error?.message || "OpenAI request failed.";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  const report = outputText(payload);
  if (!report) {
    return NextResponse.json({ error: "OpenAI returned no report text." }, { status: 502 });
  }

  return NextResponse.json({
    report,
    model,
    generatedAt: new Date().toISOString()
  });
}
