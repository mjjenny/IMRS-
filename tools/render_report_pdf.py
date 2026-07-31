"""Render an IMRS report JSON/Markdown file to a premium PDF with WeasyPrint.

Usage:
  python tools/render_report_pdf.py input.json output.pdf
  python tools/render_report_pdf.py input.md output.pdf

The JSON input should contain one of: report, markdown, content.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path


CSS = """
@page {
  size: A4;
  margin: 17mm 15mm 18mm 15mm;
  @bottom-left {
    content: "__FOOTER_LEFT__";
    color: #6b7d75;
    font-size: 7.5pt;
    letter-spacing: 0.2pt;
  }
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    color: #6b7d75;
    font-size: 7.5pt;
  }
}

@page cover {
  margin: 0;
  @bottom-left {
    content: "";
  }
  @bottom-right {
    content: "";
  }
}

* {
  box-sizing: border-box;
}

body {
  background: #ffffff;
  color: #102019;
  font-family: "Segoe UI", "Arial", sans-serif;
  font-size: 9.7pt;
  line-height: 1.48;
  margin: 0;
}

.cover {
  background: #f5faf7;
  min-height: 280mm;
  page: cover;
  page-break-after: always;
  padding: 24mm 20mm 18mm;
  position: relative;
}

.cover:before {
  background: #06251b;
  content: "";
  height: 8mm;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.brand-row {
  align-items: center;
  display: flex;
  gap: 10pt;
  margin-bottom: 24mm;
}

.brand-mark {
  align-items: center;
  background: #0f8565;
  border-radius: 7pt;
  color: #ffffff;
  display: flex;
  font-size: 18pt;
  font-weight: 800;
  height: 32pt;
  justify-content: center;
  width: 32pt;
}

.brand-name {
  color: #06251b;
  font-size: 16pt;
  font-weight: 800;
  line-height: 1;
}

.brand-subtitle {
  color: #60736b;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.6pt;
  margin-top: 3pt;
  text-transform: uppercase;
}

.cover-kicker {
  color: #08765b;
  font-size: 8pt;
  font-weight: 800;
  letter-spacing: 0.8pt;
  margin-bottom: 8pt;
  text-transform: uppercase;
}

.cover-title {
  color: #051a13;
  font-size: 30pt;
  font-weight: 850;
  line-height: 1.07;
  margin: 0 0 18pt;
  max-width: 170mm;
}

.cover-rule {
  background: #0f8565;
  height: 2pt;
  margin: 0 0 18pt;
  width: 38mm;
}

.meta-grid {
  display: grid;
  gap: 8pt;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 0 12pt;
}

.meta-card {
  background: #ffffff;
  border: 0.6pt solid #d2dfd9;
  border-radius: 7pt;
  padding: 9pt 10pt;
}

.meta-label {
  color: #60736b;
  font-size: 7.3pt;
  font-weight: 800;
  letter-spacing: 0.4pt;
  margin-bottom: 4pt;
  text-transform: uppercase;
}

.meta-value {
  color: #061c14;
  font-size: 11pt;
  font-weight: 750;
  line-height: 1.25;
}

.score-grid {
  display: grid;
  gap: 8pt;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 0 14pt;
}

.score-card {
  background: #061c14;
  border-radius: 8pt;
  color: #ffffff;
  min-height: 27mm;
  padding: 9pt 10pt;
}

.score-card.trap {
  background: #4a201d;
}

.score-label {
  color: #9bd8c3;
  font-size: 7.2pt;
  font-weight: 800;
  letter-spacing: 0.45pt;
  margin-bottom: 5pt;
  text-transform: uppercase;
}

.score-value {
  font-size: 21pt;
  font-weight: 850;
  line-height: 1;
}

.score-scale {
  color: #c7dad2;
  font-size: 8pt;
  margin-top: 3pt;
}

.stance-card {
  background: #061c14;
  border-radius: 9pt;
  color: #ffffff;
  margin-top: 14pt;
  max-width: 170mm;
  padding: 14pt 16pt;
}

.stance-label {
  color: #9bd8c3;
  font-size: 7.5pt;
  font-weight: 800;
  letter-spacing: 0.6pt;
  margin-bottom: 5pt;
  text-transform: uppercase;
}

.stance-value {
  font-size: 13pt;
  font-weight: 750;
  line-height: 1.35;
}

.cover-footer {
  color: #60736b;
  font-size: 8pt;
  margin-top: 16pt;
}

.executive-summary {
  background: #f6faf8;
  border: 0.8pt solid #cfdfd8;
  border-radius: 9pt;
  break-after: page;
  margin: 0 0 12pt;
  padding: 12pt 14pt;
}

.summary-kicker {
  color: #08765b;
  font-size: 7.4pt;
  font-weight: 850;
  letter-spacing: 0.6pt;
  margin-bottom: 4pt;
  text-transform: uppercase;
}

.summary-title {
  color: #061c14;
  font-size: 15pt;
  font-weight: 850;
  line-height: 1.15;
  margin: 0 0 8pt;
}

.summary-grid {
  display: grid;
  gap: 7pt;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 8pt;
}

.summary-card {
  background: #ffffff;
  border: 0.5pt solid #d2dfd9;
  border-radius: 6pt;
  padding: 7pt 8pt;
}

main {
  padding-top: 1mm;
}

h1 {
  color: #06251b;
  font-size: 22pt;
  line-height: 1.12;
  margin: 0 0 12pt;
}

h2 {
  border-bottom: 1.2pt solid #cfe0d8;
  break-after: avoid;
  color: #08765b;
  font-size: 14.2pt;
  line-height: 1.18;
  margin: 18pt 0 8pt;
  padding-bottom: 4pt;
}

h2:nth-of-type(n+4) {
  break-before: auto;
}

h2.major-section {
  break-before: page;
}

h2:first-child {
  margin-top: 0;
}

h3 {
  break-after: avoid;
  color: #14382f;
  font-size: 11.2pt;
  line-height: 1.25;
  margin: 12pt 0 5pt;
}

p {
  margin: 0 0 7pt;
}

strong {
  color: #07130f;
  font-weight: 800;
}

ul, ol {
  margin: 0 0 8pt 15pt;
  padding: 0;
}

li {
  margin-bottom: 3pt;
}

table {
  border-collapse: collapse;
  break-inside: auto;
  font-size: 8.3pt;
  line-height: 1.34;
  margin: 8pt 0 12pt;
  table-layout: fixed;
  width: 100%;
}

table.wide-table {
  font-size: 7.6pt;
}

table.valuation-table th,
table.valuation-table td {
  padding: 5pt 5.2pt;
}

table.risk-table th,
table.catalyst-table th,
table.valuation-table th {
  background: #06251b;
}

thead {
  display: table-header-group;
}

tr {
  break-inside: avoid;
}

th {
  background: #083d31;
  color: #ffffff;
  font-weight: 800;
  letter-spacing: 0.1pt;
}

td {
  background: #ffffff;
}

tbody tr:nth-child(even) td {
  background: #f6faf8;
}

th, td {
  border: 0.45pt solid #c6d8d0;
  overflow-wrap: anywhere;
  padding: 5.3pt 5.7pt;
  text-align: left;
  vertical-align: top;
}

table + p {
  margin-top: 2pt;
}
"""


def load_report(path: Path) -> tuple[str, str, dict[str, str]]:
  text = path.read_text(encoding="utf-8-sig")
  metadata: dict[str, str] = {}
  if path.suffix.lower() == ".json":
    payload = json.loads(text)
    report = str(payload.get("report") or payload.get("markdown") or payload.get("content") or "")
    title = first_heading(report) or str(payload.get("title") or "IMRS Institutional Stock Research Report")
    for key in ["ticker", "companyName", "asOfDate"]:
      if payload.get(key):
        metadata[key] = str(payload[key])
    return title, report, metadata

  title = first_heading(text) or "IMRS Institutional Stock Research Report"
  return title, text, metadata


def first_heading(markdown: str) -> str | None:
  match = re.search(r"^#\s+(.+)$", markdown, flags=re.MULTILINE)
  if match:
    return match.group(1).strip()
  return None


def parse_report_header(markdown: str, metadata: dict[str, str]) -> dict[str, str]:
  fields = dict(metadata)
  for line in markdown.splitlines():
    if line.startswith("## "):
      break
    match = re.match(r"^([A-Za-z ]+):\s*(.+?)(?:\s{2,})?$", line.strip())
    if match:
      fields[match.group(1).strip()] = match.group(2).strip()
  return fields


def strip_cover_content(markdown: str) -> str:
  lines = markdown.splitlines()
  start = 0
  for index, line in enumerate(lines):
    if line.startswith("## "):
      start = index
      break
  return "\n".join(lines[start:]) if start else markdown


def inline_markdown(value: str) -> str:
  escaped = html.escape(value)
  escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
  return escaped


def css_string(value: str) -> str:
  return value.replace("\\", "\\\\").replace('"', '\\"')


def css_for(fields: dict[str, str]) -> str:
  ticker = fields.get("Ticker") or fields.get("ticker") or "IMRS"
  date = report_date(fields)
  footer = " | ".join(value for value in ["IMRS Institutional Stock Research", ticker, date] if value)
  return CSS.replace("__FOOTER_LEFT__", css_string(footer))


def score_number(value: str) -> str:
  match = re.search(r"(\d+(?:\.\d+)?)\s*/\s*(?:100|10)", value)
  if match:
    return match.group(1)
  match = re.search(r"\d+(?:\.\d+)?", value)
  return match.group(0) if match else ""


def table_class(head: list[str], max_cols: int) -> str:
  header = " ".join(head).lower()
  classes = []
  if max_cols >= 5:
    classes.append("wide-table")
  if "scenario" in header and "probability" in header:
    classes.append("valuation-table")
  if "risk" in header and "monitoring" in header:
    classes.append("risk-table")
  if "catalyst" in header and "timing" in header:
    classes.append("catalyst-table")
  return f' class="{" ".join(classes)}"' if classes else ""


def render_table(lines: list[str]) -> str:
  rows: list[list[str]] = []
  for line in lines:
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    if all(set(cell) <= set("-: ") for cell in cells):
      continue
    rows.append(cells)

  if not rows:
    return ""

  max_cols = max(len(row) for row in rows)
  normalized = [row + [""] * (max_cols - len(row)) for row in rows]
  head = normalized[0]
  body = normalized[1:]

  out = [f"<table{table_class(head, max_cols)}>", "<thead><tr>"]
  out.extend(f"<th>{inline_markdown(cell)}</th>" for cell in head)
  out.append("</tr></thead>")
  if body:
    out.append("<tbody>")
    for row in body:
      out.append("<tr>" + "".join(f"<td>{inline_markdown(cell)}</td>" for cell in row) + "</tr>")
    out.append("</tbody>")
  out.append("</table>")
  return "\n".join(out)


def markdown_to_html(markdown: str) -> str:
  lines = strip_cover_content(markdown).splitlines()
  body: list[str] = []
  paragraph: list[str] = []
  list_items: list[str] = []
  ordered_items: list[str] = []
  index = 0

  def flush_paragraph() -> None:
    if paragraph:
      body.append(f"<p>{inline_markdown(' '.join(paragraph))}</p>")
      paragraph.clear()

  def flush_lists() -> None:
    if list_items:
      body.append("<ul>" + "".join(f"<li>{inline_markdown(item)}</li>" for item in list_items) + "</ul>")
      list_items.clear()
    if ordered_items:
      body.append("<ol>" + "".join(f"<li>{inline_markdown(item)}</li>" for item in ordered_items) + "</ol>")
      ordered_items.clear()

  while index < len(lines):
    line = lines[index].rstrip()

    if not line:
      flush_paragraph()
      flush_lists()
      index += 1
      continue

    if line.startswith("| "):
      flush_paragraph()
      flush_lists()
      table_lines: list[str] = []
      while index < len(lines) and lines[index].startswith("| "):
        table_lines.append(lines[index])
        index += 1
      body.append(render_table(table_lines))
      continue

    if line.startswith("# "):
      flush_paragraph()
      flush_lists()
      index += 1
      continue

    if line.startswith("## "):
      flush_paragraph()
      flush_lists()
      title = line[3:].strip()
      major = re.match(r"^(9|11|15)\.\s+", title)
      class_attr = ' class="major-section"' if major else ""
      body.append(f"<h2{class_attr}>{inline_markdown(title)}</h2>")
      index += 1
      continue

    if line.startswith("### "):
      flush_paragraph()
      flush_lists()
      body.append(f"<h3>{inline_markdown(line[4:].strip())}</h3>")
      index += 1
      continue

    if line.startswith("- "):
      flush_paragraph()
      ordered_items.clear()
      list_items.append(line[2:].strip())
      index += 1
      continue

    ordered_match = re.match(r"^\d+\.\s+(.+)$", line)
    if ordered_match:
      flush_paragraph()
      list_items.clear()
      ordered_items.append(ordered_match.group(1).strip())
      index += 1
      continue

    flush_lists()
    paragraph.append(line)
    index += 1

  flush_paragraph()
  flush_lists()
  return "\n".join(body)


def report_date(fields: dict[str, str]) -> str:
  return fields.get("Report date") or fields.get("asOfDate") or ""


def extract_section(markdown: str, section_number: int) -> str:
  pattern = rf"(?ms)^##\s+{section_number}\.\s+.*?\n(.*?)(?=^##\s+\d+\.|\Z)"
  match = re.search(pattern, markdown)
  return match.group(1).strip() if match else ""


def paragraph_snippets(section: str, limit: int = 3) -> list[str]:
  snippets: list[str] = []
  for block in re.split(r"\n\s*\n", section):
    clean = re.sub(r"^#+\s+", "", block.strip())
    clean = re.sub(r"^\s*[-*]\s+", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    if clean and not clean.startswith("|") and len(clean) > 40:
      snippets.append(clean)
    if len(snippets) >= limit:
      break
  return snippets


def executive_summary_html(markdown: str, fields: dict[str, str]) -> str:
  snippets = paragraph_snippets(extract_section(markdown, 1), 3)
  if not snippets:
    return ""

  cards = [
    ("Stance", fields.get("Investment stance", "")),
    ("Conviction", fields.get("Conviction score", "")),
    ("Risk lens", fields.get("Potential trap risk", "")),
  ]
  card_html = "\n".join(
    f"""
    <div class="summary-card">
      <div class="meta-label">{html.escape(label)}</div>
      <div class="meta-value">{inline_markdown(value)}</div>
    </div>
    """
    for label, value in cards
    if value
  )

  body = "\n".join(f"<p>{inline_markdown(item)}</p>" for item in snippets)
  return f"""
  <section class="executive-summary">
    <div class="summary-kicker">One-page committee brief</div>
    <div class="summary-title">Executive Summary</div>
    {body}
    <div class="summary-grid">{card_html}</div>
  </section>
  """


def cover_html(title: str, fields: dict[str, str]) -> str:
  company = fields.get("Company") or fields.get("companyName") or title
  ticker = fields.get("Ticker") or fields.get("ticker") or ""
  date = report_date(fields)
  posture = fields.get("Research posture") or "Institutional stock research"
  stance = fields.get("Investment stance") or "Evidence-backed investment committee report"
  conviction = fields.get("Conviction score") or ""
  multibagger = fields.get("Multibagger potential") or ""
  trap = fields.get("Potential trap risk") or ""

  cards = [
    ("Company", company),
    ("Ticker", ticker),
    ("Report date", date),
    ("Research posture", posture),
  ]
  card_html = "\n".join(
    f"""
    <div class="meta-card">
      <div class="meta-label">{html.escape(label)}</div>
      <div class="meta-value">{inline_markdown(value)}</div>
    </div>
    """
    for label, value in cards
    if value
  )
  score_cards = [
    ("Conviction", conviction, ""),
    ("Multibagger", multibagger, ""),
    ("Trap risk", trap, " trap"),
  ]
  score_html = "\n".join(
    f"""
    <div class="score-card{extra_class}">
      <div class="score-label">{html.escape(label)}</div>
      <div class="score-value">{html.escape(score_number(value) or value)}</div>
      <div class="score-scale">/ 100</div>
    </div>
    """
    for label, value, extra_class in score_cards
    if value
  )

  return f"""
  <section class="cover">
    <div class="brand-row">
      <div class="brand-mark">I</div>
      <div>
        <div class="brand-name">IMRS Enterprise</div>
        <div class="brand-subtitle">Institutional stock research</div>
      </div>
    </div>
    <div class="cover-kicker">Final stock report</div>
    <h1 class="cover-title">{inline_markdown(title)}</h1>
    <div class="cover-rule"></div>
    <div class="meta-grid">{card_html}</div>
    <div class="score-grid">{score_html}</div>
    <div class="stance-card">
      <div class="stance-label">Investment stance</div>
      <div class="stance-value">{inline_markdown(stance)}</div>
    </div>
    <div class="cover-footer">Prepared for IMRS research workflow. This document is research support and not financial advice.</div>
  </section>
  """


def document_html(title: str, markdown: str, fields: dict[str, str]) -> str:
  body_html = markdown_to_html(markdown)
  return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>{html.escape(title)}</title>
  <style>{css_for(fields)}</style>
</head>
<body>
  {cover_html(title, fields)}
  {executive_summary_html(markdown, fields)}
  <main>
    {body_html}
  </main>
</body>
</html>
"""


def main() -> int:
  if len(sys.argv) != 3:
    print("Usage: python tools/render_report_pdf.py input.json output.pdf", file=sys.stderr)
    return 2

  input_path = Path(sys.argv[1])
  output_path = Path(sys.argv[2])
  title, markdown, metadata = load_report(input_path)
  if not markdown.strip():
    print("Input report is empty.", file=sys.stderr)
    return 1

  try:
    from weasyprint import HTML
  except ImportError:
    print("WeasyPrint is not installed in this Python environment.", file=sys.stderr)
    print("Install it with: python -m pip install weasyprint", file=sys.stderr)
    return 1

  fields = parse_report_header(markdown, metadata)
  html_text = document_html(title, markdown, fields)
  output_path.parent.mkdir(parents=True, exist_ok=True)
  HTML(string=html_text, base_url=str(input_path.parent)).write_pdf(str(output_path))
  print(output_path)
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
