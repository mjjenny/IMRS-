"""Quality gate for IMRS final stock research reports.

The checker enforces the stock-only report standard in docs/REPORT_TEMPLATE.md.
It is intentionally conservative about hard failures: structural problems and
raw pipeline leaks fail the gate, while wording and verification concerns are
reported as warnings for analyst review.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path


REQUIRED_SECTIONS = [
  "Executive Verdict",
  "Business Overview",
  "Investment Thesis",
  "Financial Performance",
  "Financial Quality",
  "Industry Opportunity",
  "Management And Execution",
  "Ownership Quality",
  "Valuation",
  "Multibagger Potential",
  "Potential Trap Analysis",
  "Catalysts",
  "Key Risks",
  "Stock Monitoring Checklist",
  "Final Recommendation",
]

REQUIRED_HEADER_FIELDS = [
  "Company:",
  "Ticker:",
  "Report date:",
  "Research posture:",
  "Investment stance:",
  "Conviction score:",
  "Multibagger potential:",
  "Potential trap risk:",
]

FORBIDDEN_TERMS = [
  "Trendlyne",
  "Kite",
  "MCP",
  "API",
  "connector",
  "sync",
  "payload",
  "parser",
  "parsing",
  "raw data",
  "data pipeline",
  "backend",
  "Vercel",
]

RAW_LEAK_PATTERNS = [
  r"\bstockHeaders\b",
  r"\btableHeaders\b",
  r"\btableData\b",
  r"\bstockData\b",
  r"\bnewsList\b",
  r"\bsummaryData\b",
  r"\bchartData\b",
  r"\bisCurtail\b",
  r"\bcurtailMsg\b",
  r"\bcurrentPrice\s*\|\s*dayChangeP\b",
  r"\bNSEcode\s*\|\s*BSEcode\b",
  r"\bdescriptionHTML\b",
  r"\bpostTypeNumber\b",
]

FINANCIAL_LINE_PATTERN = re.compile(
  r"(?i)\b(revenue|sales|pat|profit|eps|ebitda|margin|roe|roce|cash flow|debt|p/e|multiple|market cap|holding)\b"
)
FIGURE_PATTERN = re.compile(r"(?i)(\b\d+(?:\.\d+)?\s*(?:%|x|crore|cr|inr)\b|\bINR\s*\d)")
PERIOD_PATTERN = re.compile(
  r"(?i)\b(FY\d{2}|FY20\d{2}|Q[1-4]\s*FY\d{2}|Q[1-4]\s*FY20\d{2}|TTM|trailing|annualised|annualized|as of|report date|reference price|latest|current|prior|quarter|year|around|about|near|approximately|approximate|unverified)\b"
)

CRITICAL_METRIC_KEYS = [
  "revenue",
  "netProfit",
  "eps",
  "pe",
  "roe",
  "roce",
  "debtEquity",
  "promoterHolding",
  "salesGrowth",
  "profitGrowth",
  "opm",
  "operatingCashFlow",
  "currentPrice",
  "marketCap",
]

PROVENANCE_FIELDS = ["value", "unit", "period", "periodType", "asOf", "source", "confidence"]


@dataclass
class CheckResult:
  errors: list[str]
  warnings: list[str]

  @property
  def passed(self) -> bool:
    return not self.errors


def load_payload(path: Path) -> dict[str, object]:
  text = path.read_text(encoding="utf-8-sig")
  payload = json.loads(text)
  if not isinstance(payload, dict):
    raise ValueError("Report JSON must contain an object at the top level.")
  return payload


def report_text(payload: dict[str, object]) -> str:
  value = payload.get("report") or payload.get("markdown") or payload.get("content")
  return str(value or "")


def line_number(text: str, pattern: str, flags: int = re.IGNORECASE) -> int | None:
  compiled = re.compile(pattern, flags)
  for index, line in enumerate(text.splitlines(), start=1):
    if compiled.search(line):
      return index
  return None


def has_required_section(markdown: str, index: int, title: str) -> bool:
  flexible_title = re.escape(title).replace(r"\ ", r"\s+")
  patterns = [
    rf"(?im)^##\s+{index}\.\s+{flexible_title}\b",
    rf"(?im)^##\s+{index}\s+{flexible_title}\b",
    rf"(?im)^##\s+{flexible_title}\b",
  ]
  return any(re.search(pattern, markdown) for pattern in patterns)


def score_values(markdown: str, label: str) -> list[int]:
  values: list[int] = []
  for match in re.finditer(rf"(?i){re.escape(label)}\s*:\s*(\d+)\s*/\s*(?:100|10)", markdown):
    values.append(int(match.group(1)))
  return values


def check_metadata(payload: dict[str, object], errors: list[str], warnings: list[str]) -> None:
  required = ["title", "ticker", "companyName", "asOfDate", "reportType", "format", "report"]
  for key in required:
    if not str(payload.get(key) or "").strip():
      errors.append(f"Missing required JSON field: {key}")

  if payload.get("reportType") != "stock-only-final-report":
    errors.append("reportType must be stock-only-final-report.")

  if payload.get("format") != "markdown":
    errors.append("format must be markdown.")

  ticker = str(payload.get("ticker") or "").strip()
  if ticker and not re.fullmatch(r"[A-Z0-9-]{2,24}", ticker):
    warnings.append(f"Ticker '{ticker}' has an unusual format; verify before publishing.")

  date_value = str(payload.get("asOfDate") or "").strip()
  if date_value and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_value):
    errors.append("asOfDate must use YYYY-MM-DD format.")


def check_structure(markdown: str, errors: list[str], warnings: list[str]) -> None:
  if len(markdown.strip()) < 5000:
    warnings.append("Report is short for an institutional memo; confirm depth before publishing.")

  if not re.search(r"(?m)^#\s+.+Institutional Stock Research Report", markdown):
    errors.append("Missing title heading ending in Institutional Stock Research Report.")

  for field in REQUIRED_HEADER_FIELDS:
    if field not in markdown:
      errors.append(f"Missing report header field: {field}")

  for index, title in enumerate(REQUIRED_SECTIONS, start=1):
    if not has_required_section(markdown, index, title):
      errors.append(f"Missing required section {index}: {title}")

  if "Valuation Scenarios" not in markdown:
    errors.append("Missing Valuation Scenarios table heading.")

  if "What Must Happen For 5x Potential" not in markdown:
    errors.append("Missing 5x potential requirements.")

  if "What Must Happen For 10x Potential" not in markdown:
    errors.append("Missing 10x potential requirements.")


def check_stock_only_language(markdown: str, errors: list[str], warnings: list[str]) -> None:
  for term in FORBIDDEN_TERMS:
    match_line = line_number(markdown, rf"\b{re.escape(term)}\b")
    if match_line is not None:
      errors.append(f"Forbidden provider/internal term '{term}' appears on line {match_line}.")

  for pattern in RAW_LEAK_PATTERNS:
    match_line = line_number(markdown, pattern)
    if match_line is not None:
      errors.append(f"Raw connector/payload text appears on line {match_line}: {pattern}")

  if re.search(r"(?i)\bmissing data\b|\bunavailable\b|\bdiscrepancy\b|\bmislabeled\b", markdown):
    warnings.append("Report refers to data gaps or discrepancies; translate these into investment-language caveats if reader-facing.")


def check_scores(markdown: str, errors: list[str], warnings: list[str]) -> None:
  for label in ["Conviction score", "Multibagger potential", "Potential trap risk"]:
    values = score_values(markdown, label)
    if not values:
      errors.append(f"Missing calibrated score: {label}")
      continue
    for value in values:
      if value in {0, 100}:
        errors.append(f"{label} must not be an extreme 0/100 or 100/100.")
      elif value < 20 or value > 80:
        warnings.append(f"{label} of {value} is outside the normal 20-80 range; verify evidence supports it.")


def check_valuation(markdown: str, errors: list[str], warnings: list[str]) -> None:
  scenario_rows = {}
  for scenario in ["Bear", "Base", "Bull"]:
    match = re.search(rf"(?im)^\|\s*{scenario}\s+case\s*\|(.+)$", markdown)
    if not match:
      errors.append(f"Valuation scenario row missing: {scenario} case.")
      continue
    row = match.group(0)
    scenario_rows[scenario] = row
    probability_match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*\|?\s*$", row)
    if not probability_match:
      errors.append(f"{scenario} case row must end with a probability percentage.")
    else:
      probability = float(probability_match.group(1))
      if probability <= 0 or probability >= 100:
        errors.append(f"{scenario} case probability must be between 0 and 100.")

    if re.search(r"INR\s*-|\|\s*-?\d+(?:\.\d+)?\s*\|\s*-", row):
      errors.append(f"{scenario} case contains a negative scenario value; verify valuation logic.")

  probabilities: list[float] = []
  for row in scenario_rows.values():
    match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*\|?\s*$", row)
    if match:
      probabilities.append(float(match.group(1)))

  if len(probabilities) == 3 and abs(sum(probabilities) - 100) > 0.01:
    errors.append(f"Valuation scenario probabilities sum to {sum(probabilities):.2f}%, not 100%.")

  implied_prices = [float(value.replace(",", "")) for value in re.findall(r"(?i)implied price(?: range)?[^\n|]*INR\s*([0-9,]+(?:\.\d+)?)", markdown)]
  if len(implied_prices) >= 2:
    low = min(implied_prices)
    high = max(implied_prices)
    if low > 0 and high / low > 8:
      warnings.append("Implied valuation range is very wide; ensure bull case is defended with explicit EPS and multiple assumptions.")


def check_period_labelling(markdown: str, warnings: list[str]) -> None:
  for index, line in enumerate(markdown.splitlines(), start=1):
    stripped = line.strip()
    if (
      not stripped
      or stripped.startswith("#")
      or stripped.startswith("|")
      or stripped.endswith("?")
    ):
      continue
    if FINANCIAL_LINE_PATTERN.search(stripped) and FIGURE_PATTERN.search(stripped) and not PERIOD_PATTERN.search(stripped):
      warnings.append(f"Possible floating financial figure on line {index}: {stripped[:140]}")


def check_provenance(payload: dict[str, object], errors: list[str], warnings: list[str], require_provenance: bool) -> None:
  report_quality = payload.get("reportQualityRules")
  declares_requirement = isinstance(report_quality, dict) and bool(report_quality.get("requireCriticalMetricProvenance"))
  must_check = require_provenance or declares_requirement
  metrics = payload.get("criticalMetrics")

  if not isinstance(metrics, dict):
    message = "Missing criticalMetrics provenance block."
    if must_check:
      errors.append(message)
    else:
      warnings.append(message)
    return

  for key in CRITICAL_METRIC_KEYS:
    metric = metrics.get(key)
    if not isinstance(metric, dict):
      errors.append(f"Missing provenance for critical metric: {key}")
      continue

    for field in PROVENANCE_FIELDS:
      if field not in metric:
        errors.append(f"Metric '{key}' is missing provenance field: {field}")

    confidence = str(metric.get("confidence") or "").strip().lower()
    unit = str(metric.get("unit") or "").strip()
    source = str(metric.get("source") or "").strip()
    period = str(metric.get("period") or metric.get("asOf") or "").strip()

    if not unit:
      errors.append(f"Metric '{key}' has no unit.")
    if not source:
      errors.append(f"Metric '{key}' has no source.")
    if confidence in {"", "missing"}:
      warnings.append(f"Metric '{key}' has missing/low provenance confidence.")
    if key not in {"currentPrice", "marketCap", "pe"} and not period:
      warnings.append(f"Metric '{key}' has no period/as-of date; keep it out of primary report tables.")


def check_declared_quality_blocks(payload: dict[str, object], errors: list[str], warnings: list[str]) -> None:
  report_quality = payload.get("reportQualityRules")
  if not isinstance(report_quality, dict):
    return

  if report_quality.get("requireUsableMetricSummary"):
    summary = payload.get("criticalMetricSummary")
    if not isinstance(summary, dict):
      errors.append("Missing criticalMetricSummary despite requireUsableMetricSummary=true.")
    else:
      for field in ["available", "verifiedOrDerived", "readyForPrimaryTable", "mustVerifyBeforeUse"]:
        if field not in summary:
          errors.append(f"criticalMetricSummary is missing field: {field}")
      ready = summary.get("readyForPrimaryTable")
      if isinstance(ready, list) and len(ready) < 6:
        warnings.append("Fewer than six critical metrics are ready for primary tables; report confidence should be conservative.")

  if report_quality.get("requireSegmentAnalysis"):
    segment = payload.get("segmentAnalysis")
    if not isinstance(segment, dict):
      errors.append("Missing segmentAnalysis despite requireSegmentAnalysis=true.")
    else:
      for field in ["required", "status", "knownSegments", "codexMustAnalyze"]:
        if field not in segment:
          errors.append(f"segmentAnalysis is missing field: {field}")
      if segment.get("required") is True and segment.get("status") == "required":
        warnings.append("Segment analysis is marked required but incomplete; final verdict must be cautious.")

  if report_quality.get("requireScoreExplanation"):
    rationale = payload.get("scoringRationale")
    if not isinstance(rationale, dict):
      errors.append("Missing scoringRationale despite requireScoreExplanation=true.")
      return
    for field in ["convictionScoreBasis", "multibaggerScoreBasis", "trapRiskBasis", "scorecardRationale"]:
      if not isinstance(rationale.get(field), list) or not rationale.get(field):
        errors.append(f"scoringRationale requires non-empty list: {field}")


def run_checks(path: Path, require_provenance: bool = False) -> CheckResult:
  errors: list[str] = []
  warnings: list[str] = []

  try:
    payload = load_payload(path)
  except Exception as exc:
    return CheckResult(errors=[f"Could not read report JSON: {exc}"], warnings=[])

  markdown = report_text(payload)
  check_metadata(payload, errors, warnings)
  check_structure(markdown, errors, warnings)
  check_stock_only_language(markdown, errors, warnings)
  check_scores(markdown, errors, warnings)
  check_valuation(markdown, errors, warnings)
  check_period_labelling(markdown, warnings)
  check_provenance(payload, errors, warnings, require_provenance)
  check_declared_quality_blocks(payload, errors, warnings)

  return CheckResult(errors=errors, warnings=warnings)


def print_result(path: Path, result: CheckResult) -> None:
  status = "PASS" if result.passed else "FAIL"
  print(f"IMRS report QC: {status}")
  print(f"Report: {path}")
  print(f"Errors: {len(result.errors)}")
  for item in result.errors:
    print(f"  - {item}")
  print(f"Warnings: {len(result.warnings)}")
  for item in result.warnings:
    print(f"  - {item}")


def main() -> int:
  parser = argparse.ArgumentParser(description="Validate an IMRS final report JSON before publishing.")
  parser.add_argument("report", type=Path, help="Path to public/reports/TICKER.json")
  parser.add_argument("--strict", action="store_true", help="Return a failing exit code when errors are found.")
  parser.add_argument("--require-provenance", action="store_true", help="Fail reports that do not include criticalMetrics provenance.")
  args = parser.parse_args()

  result = run_checks(args.report, require_provenance=args.require_provenance)
  print_result(args.report, result)
  if args.strict and not result.passed:
    return 1
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
