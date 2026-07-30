import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ReportRequest = {
  company?: unknown;
  trendlyne?: unknown;
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
- If source data is thin or contradictory, say exactly what is missing.
- Focus on future prospects, multibagger potential and potential trap risk.
- Use plain analyst language, not raw JSON.
- Include these sections: Executive verdict, Business quality, Financial quality, Valuation, Growth runway, Ownership, Risks, Catalysts, Multibagger probability, Trap probability, Final recommendation, What must happen for 5x/10x, What would make this fail.

Rule-based report:
${body.ruleBasedReport || "Not supplied."}

Company and source packet:
${compactJson({ company: body.company, trendlyne: body.trendlyne })}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 2600
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
