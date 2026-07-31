const baseUrl = (process.env.IMRS_SMOKE_BASE_URL || process.argv[2] || "https://imrs-omega.vercel.app").replace(/\/$/, "");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function readJson(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, { cache: "no-store", signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 160)}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function numericPercent(value) {
  const numberValue = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 100;
}

const checks = [
  async () => {
    const payload = await readJson("/api/company-search?q=RELIANCE");
    const results = payload.results || [];
    assert(results.some((row) => row.exchange === "NSE" && row.ticker === "RELIANCE"), "NSE Reliance search result missing.");
    assert(results.some((row) => row.exchange === "BSE" && row.bseCode === "500325"), "BSE Reliance search result missing.");
  },
  async () => {
    const payload = await readJson("/api/bse/financials?code=500325");
    assert(payload.record?.ticker === "RELIANCE", "BSE financials did not resolve RELIANCE.");
    assert(Number(payload.record?.currentPrice) > 0, "BSE financials missing current price.");
    assert(Number(payload.record?.pe) > 0, "BSE financials missing P/E.");
  },
  async () => {
    const payload = await readJson("/api/bse/shareholding?code=500325");
    assert(numericPercent(payload.record?.promoterHolding), "BSE shareholding missing promoter percentage.");
    assert(numericPercent(payload.record?.publicHolding), "BSE shareholding missing public percentage.");
  },
  async () => {
    const payload = await readJson("/api/nse/shareholding?symbol=RELIANCE");
    assert(numericPercent(payload.record?.promoterHolding), "NSE shareholding missing promoter percentage.");
  },
  async () => {
    const payload = await readJson("/reports/KAYNES.json");
    assert(payload.reportType === "stock-only-final-report", "Published report type mismatch.");
    assert(payload.format === "markdown", "Published report format mismatch.");
    assert(String(payload.report || "").includes("Institutional Stock Research Report"), "Published report body missing title.");
  }
];

for (const check of checks) {
  try {
    await check();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`IMRS smoke check passed: ${baseUrl}`);
