"""Render an IMRS report JSON/Markdown file to PDF with WeasyPrint.

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
  margin: 18mm 16mm 18mm 16mm;
  @bottom-left {
    content: "IMRS Institutional Stock Research";
    color: #60736b;
    font-size: 8pt;
  }
  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    color: #60736b;
    font-size: 8pt;
  }
}

body {
  color: #102019;
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.45;
}

h1 {
  color: #06251b;
  font-size: 22pt;
  line-height: 1.12;
  margin: 0 0 12pt;
  text-align: center;
}

h2 {
  color: #08765b;
  font-size: 15pt;
  margin: 20pt 0 8pt;
}

h3 {
  color: #12352b;
  font-size: 11.5pt;
  margin: 14pt 0 6pt;
}

p {
  margin: 0 0 8pt;
}

strong {
  color: #07130f;
}

ul, ol {
  margin: 0 0 9pt 18pt;
  padding: 0;
}

li {
  margin-bottom: 3pt;
}

table {
  border-collapse: collapse;
  margin: 8pt 0 12pt;
  width: 100%;
}

th {
  background: #dff2ea;
  color: #06251b;
  font-weight: 700;
}

th, td {
  border: 0.5pt solid #c6d8d0;
  padding: 5pt 6pt;
  text-align: left;
  vertical-align: top;
}

tr {
  break-inside: avoid;
}

.meta {
  background: #f7faf8;
  border: 0.5pt solid #d7e1dc;
  border-radius: 5pt;
  margin: 0 0 14pt;
  padding: 9pt 10pt;
}

.meta p {
  margin-bottom: 3pt;
}
"""


def load_markdown(path: Path) -> tuple[str, str]:
  text = path.read_text(encoding="utf-8")
  if path.suffix.lower() == ".json":
    payload = json.loads(text)
    title = str(payload.get("title") or "IMRS Institutional Stock Research Report")
    report = str(payload.get("report") or payload.get("markdown") or payload.get("content") or "")
    return title, report

  title = "IMRS Institutional Stock Research Report"
  first_heading = re.search(r"^#\s+(.+)$", text, flags=re.MULTILINE)
  if first_heading:
    title = first_heading.group(1).strip()
  return title, text


def inline_markdown(value: str) -> str:
  escaped = html.escape(value)
  escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
  return escaped


def render_table(lines: list[str]) -> str:
  rows: list[list[str]] = []
  for line in lines:
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    if all(set(cell) <= set("-: ") for cell in cells):
      continue
    rows.append(cells)

  if not rows:
    return ""

  out = ["<table>"]
  for index, row in enumerate(rows):
    tag = "th" if index == 0 else "td"
    out.append("<tr>" + "".join(f"<{tag}>{inline_markdown(cell)}</{tag}>" for cell in row) + "</tr>")
  out.append("</table>")
  return "\n".join(out)


def markdown_to_html(markdown: str, title: str) -> str:
  lines = markdown.splitlines()
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
      heading = line[2:].strip()
      if heading != title:
        body.append(f"<h1>{inline_markdown(heading)}</h1>")
      index += 1
      continue

    if line.startswith("## "):
      flush_paragraph()
      flush_lists()
      body.append(f"<h2>{inline_markdown(line[3:].strip())}</h2>")
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

  return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>{html.escape(title)}</title>
  <style>{CSS}</style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  <main>
    {' '.join(body)}
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
  title, markdown = load_markdown(input_path)
  if not markdown.strip():
    print("Input report is empty.", file=sys.stderr)
    return 1

  try:
    from weasyprint import HTML
  except ImportError:
    print("WeasyPrint is not installed in this Python environment.", file=sys.stderr)
    print("Install it with: python -m pip install weasyprint", file=sys.stderr)
    return 1

  html_text = markdown_to_html(markdown, title)
  output_path.parent.mkdir(parents=True, exist_ok=True)
  HTML(string=html_text, base_url=str(input_path.parent)).write_pdf(str(output_path))
  print(output_path)
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
