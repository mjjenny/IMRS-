"""Extract first-pass financial evidence from BSE PDF filings.

This is a conservative extractor: it emits structured candidates plus warnings,
not final report-ready numbers. The final report should use these outputs only
after period, unit and share-basis checks pass.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


LABEL_ALIASES = {
  "revenue": ["revenue from operations", "total income", "income from operations", "net sales"],
  "netProfit": ["profit for the period", "profit after tax", "net profit", "pat"],
  "eps": ["basic eps", "diluted eps", "earnings per share"],
  "opm": ["operating margin", "ebitda margin"],
  "financeCost": ["finance costs", "interest expense"],
  "cashFlowFromOperations": ["net cash from operating activities", "cash flow from operating activities"],
  "totalDebt": ["borrowings", "total debt", "debt securities"],
  "netWorth": ["net worth", "total equity", "equity attributable"],
  "segmentRevenue": ["segment revenue", "revenue by segment"],
}

PERIOD_RE = re.compile(r"(?i)\b(quarter ended|year ended|half year ended|nine months ended)\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{2}[-/][0-9]{2}[-/][0-9]{4})")
NUMBER_RE = re.compile(r"-?\d[\d,]*(?:\.\d+)?")


def load_pdf_text(path: Path) -> tuple[str, list[str]]:
  warnings: list[str] = []
  try:
    import pdfplumber  # type: ignore[import-not-found]
  except Exception as exc:
    raise RuntimeError("pdfplumber is required. Install it with: python -m pip install pdfplumber") from exc

  chunks: list[str] = []
  with pdfplumber.open(path) as pdf:
    for page_number, page in enumerate(pdf.pages, start=1):
      text = page.extract_text() or ""
      tables = page.extract_tables() or []
      chunks.append(f"\n--- PAGE {page_number} TEXT ---\n{text}")
      for table_index, table in enumerate(tables, start=1):
        rows = [" | ".join(str(cell or "").strip() for cell in row) for row in table]
        chunks.append(f"\n--- PAGE {page_number} TABLE {table_index} ---\n" + "\n".join(rows))
  if not chunks:
    warnings.append("No extractable text found; OCR may be required.")
  return "\n".join(chunks), warnings


def load_text_filing(path: Path) -> tuple[str, list[str]]:
  text = path.read_text(encoding="utf-8-sig", errors="replace")
  text = re.sub(r"<[^>]+>", " ", text)
  text = re.sub(r"\s+", " ", text)
  return text, ["Text/XBRL-style filing parsed with conservative text extraction; verify labels and units before use."]


def load_filing_text(path: Path) -> tuple[str, list[str]]:
  if path.suffix.lower() == ".pdf":
    return load_pdf_text(path)
  return load_text_filing(path)


def infer_period(text: str) -> str:
  match = PERIOD_RE.search(text)
  return " ".join(match.groups()) if match else ""


def extract_metric(text: str, aliases: list[str]) -> dict[str, Any]:
  lines = [line.strip() for line in text.splitlines() if line.strip()]
  for alias in aliases:
    for line in lines:
      if alias.lower() not in line.lower():
        continue
      numbers = NUMBER_RE.findall(line)
      if numbers:
        return {
          "value": numbers[-1].replace(",", ""),
          "rawLine": line[:500],
          "alias": alias,
          "confidence": "candidate",
        }
  return {
    "value": "",
    "rawLine": "",
    "alias": "",
    "confidence": "missing",
  }


def extract(path: Path) -> dict[str, Any]:
  text, warnings = load_filing_text(path)
  period = infer_period(text)
  metrics: dict[str, Any] = {}
  for key, aliases in LABEL_ALIASES.items():
    item = extract_metric(text, aliases)
    item.update({
      "unit": "INR crore" if key not in {"eps", "opm"} else ("INR" if key == "eps" else "%"),
      "period": period,
      "source": "bse",
      "requiresVerification": True,
    })
    metrics[key] = item

  if not period:
    warnings.append("Could not infer filing period. Do not use extracted figures in primary report tables until period is verified.")
  if not any(item.get("value") for item in metrics.values()):
    warnings.append("No financial metric candidates were extracted.")

  return {
    "schema": "IMRS_BSE_FILING_EXTRACTION_V2",
    "sourceFile": str(path),
    "period": period,
    "metrics": metrics,
    "warnings": warnings,
    "textPreview": text[:3000],
  }


def main() -> int:
  parser = argparse.ArgumentParser(description="Extract first-pass financial evidence from a BSE PDF filing.")
  parser.add_argument("pdf", type=Path, help="Path to BSE PDF filing")
  parser.add_argument("--out", type=Path, help="Optional JSON output path")
  args = parser.parse_args()

  if not args.pdf.exists():
    print(f"PDF not found: {args.pdf}", file=sys.stderr)
    return 1

  payload = extract(args.pdf)
  text = json.dumps(payload, indent=2, ensure_ascii=False)
  if args.out:
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text, encoding="utf-8")
  else:
    print(text)
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
