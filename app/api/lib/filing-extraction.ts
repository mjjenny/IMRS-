export type FilingMetricKey =
  | "revenue"
  | "profit"
  | "eps"
  | "operatingProfit"
  | "financeCost"
  | "cfo"
  | "totalDebt"
  | "netWorth"
  | "roe"
  | "roce"
  | "debtEquity"
  | "opm";

export type FilingMetricCandidate = {
  key: FilingMetricKey;
  label: string;
  value: string;
  unit: string;
  period: string;
  source: "api-field" | "xbrl-text" | "derived";
  confidence: "high" | "medium" | "candidate" | "missing";
  rawLabel: string;
};

export type FilingExtraction = {
  period: string;
  metrics: Partial<Record<FilingMetricKey, FilingMetricCandidate>>;
  warnings: string[];
};

type AliasSet = {
  key: FilingMetricKey;
  label: string;
  unit: string;
  aliases: RegExp[];
};

const aliasSets: AliasSet[] = [
  {
    key: "revenue",
    label: "Revenue",
    unit: "INR crore",
    aliases: [/revenue.*operations/i, /income.*operations/i, /total.*income/i, /net.*sales/i]
  },
  {
    key: "profit",
    label: "Net profit",
    unit: "INR crore",
    aliases: [/profit.*period/i, /profit.*after.*tax/i, /net.*profit/i, /\bpat\b/i]
  },
  {
    key: "eps",
    label: "EPS",
    unit: "INR",
    aliases: [/basic.*eps/i, /diluted.*eps/i, /earnings.*share/i]
  },
  {
    key: "operatingProfit",
    label: "Operating profit",
    unit: "INR crore",
    aliases: [/profit.*before.*interest/i, /operating.*profit/i, /ebitda/i]
  },
  {
    key: "financeCost",
    label: "Finance cost",
    unit: "INR crore",
    aliases: [/finance.*cost/i, /interest.*expense/i]
  },
  {
    key: "cfo",
    label: "Operating cash flow",
    unit: "INR crore",
    aliases: [/cash.*operating.*activities/i, /net.*cash.*operations/i]
  },
  {
    key: "totalDebt",
    label: "Total debt",
    unit: "INR crore",
    aliases: [/borrowings/i, /debt.*securities/i, /total.*debt/i]
  },
  {
    key: "netWorth",
    label: "Net worth",
    unit: "INR crore",
    aliases: [/net.*worth/i, /total.*equity/i, /equity.*attributable/i]
  }
];

function clean(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

export function numericValue(value: string | number | null | undefined) {
  const numberValue = Number(clean(value).replace(/,/g, ""));
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatMetric(value: string | number | null | undefined, decimals = 2) {
  const numberValue = numericValue(value);
  if (!numberValue) return "";
  return numberValue.toFixed(decimals).replace(/\.?0+$/, "");
}

export function lakhsToCrore(value: string | number | null | undefined) {
  const numberValue = numericValue(value);
  return numberValue ? numberValue / 100 : 0;
}

export function metricCandidate(
  key: FilingMetricKey,
  label: string,
  value: string | number | null | undefined,
  unit: string,
  period: string,
  source: FilingMetricCandidate["source"],
  confidence: FilingMetricCandidate["confidence"],
  rawLabel = label
): FilingMetricCandidate | undefined {
  const formatted = formatMetric(value, unit === "INR crore" ? 0 : 2);
  if (!formatted) return undefined;
  return { key, label, value: formatted, unit, period, source, confidence, rawLabel };
}

export function deriveMetrics(metrics: Partial<Record<FilingMetricKey, FilingMetricCandidate>>, period: string) {
  const revenue = numericValue(metrics.revenue?.value);
  const profit = numericValue(metrics.profit?.value);
  const operatingProfit = numericValue(metrics.operatingProfit?.value);
  const totalDebt = numericValue(metrics.totalDebt?.value);
  const netWorth = numericValue(metrics.netWorth?.value);

  if (revenue && operatingProfit && !metrics.opm) {
    metrics.opm = metricCandidate("opm", "Operating margin", (operatingProfit / revenue) * 100, "%", period, "derived", "medium", "operatingProfit/revenue");
  }
  if (profit && netWorth && !metrics.roe) {
    metrics.roe = metricCandidate("roe", "ROE", (profit / netWorth) * 100, "%", period, "derived", "candidate", "profit/netWorth");
  }
  if (totalDebt && netWorth && !metrics.debtEquity) {
    metrics.debtEquity = metricCandidate("debtEquity", "Debt/equity", totalDebt / netWorth, "x", period, "derived", "candidate", "totalDebt/netWorth");
  }
}

function normalizeXbrlText(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/\r/g, "\n");
}

function tagRows(text: string) {
  const rows: Array<{ label: string; value: string }> = [];
  const regex = /<([A-Za-z0-9_:.-]+)[^>]*>([^<>]{1,160})<\/\1>/g;
  const normalized = normalizeXbrlText(text);
  let match = regex.exec(normalized);
  while (match) {
    const label = match[1].split(":").pop() || match[1];
    const value = clean(match[2]);
    if (/^-?\d[\d,]*(?:\.\d+)?$/.test(value)) rows.push({ label, value });
    match = regex.exec(normalized);
  }
  return rows;
}

function textRows(text: string) {
  return normalizeXbrlText(text)
    .replace(/<[^>]+>/g, "\n")
    .split(/\n+/)
    .map((line) => clean(line))
    .filter(Boolean)
    .map((line) => ({ label: line, value: /(-?\d[\d,]*(?:\.\d+)?)\s*$/.exec(line)?.[1] || "" }))
    .filter((row) => row.value);
}

function inferPeriod(text: string) {
  const match = /\b(?:quarter|year|half year|nine months)\s+ended\s+([0-9]{1,2}[-/\s][A-Za-z0-9]{2,9}[-/\s][0-9]{4})/i.exec(text);
  return match ? match[0] : "";
}

export function extractFromFilingText(text: string, fallbackPeriod = ""): FilingExtraction {
  const period = fallbackPeriod || inferPeriod(text);
  const rows = [...tagRows(text), ...textRows(text)];
  const metrics: Partial<Record<FilingMetricKey, FilingMetricCandidate>> = {};

  for (const aliasSet of aliasSets) {
    const row = rows.find((item) => aliasSet.aliases.some((alias) => alias.test(item.label)));
    const item = metricCandidate(aliasSet.key, aliasSet.label, row?.value, aliasSet.unit, period, "xbrl-text", row ? "candidate" : "missing", row?.label || "");
    if (item) metrics[aliasSet.key] = item;
  }

  deriveMetrics(metrics, period);

  const warnings = [];
  if (!period) warnings.push("Could not infer filing period from XBRL/text.");
  if (!Object.keys(metrics).length) warnings.push("No metric candidates extracted from XBRL/text.");

  return { period, metrics, warnings };
}

export async function fetchFilingText(url: string) {
  if (!url || !/^https?:\/\//i.test(url)) return "";
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/xml,text/xml,text/html,text/plain,*/*"
    },
    cache: "no-store"
  });
  if (!response.ok) return "";
  const type = response.headers.get("content-type") || "";
  if (/pdf/i.test(type)) return "";
  return response.text();
}

export function mergeMetric(
  primary: string,
  fallback: FilingMetricCandidate | undefined,
  decimals = 2
) {
  return primary || (fallback ? formatMetric(fallback.value, decimals) : "");
}

export function mergeCandidate(
  metrics: Partial<Record<FilingMetricKey, FilingMetricCandidate>>,
  item: FilingMetricCandidate | undefined
) {
  if (item && !metrics[item.key]) metrics[item.key] = item;
}
