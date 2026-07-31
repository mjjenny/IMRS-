# IMRS Institutional Stock Report Template

This is the formal template for every final IMRS research report. The benchmark is the Aeroflex Industries report of 30 July 2026, which the user approved as the quality standard. The analyst (the external AI working from the exported Rich Packet) must follow this structure and these rules unless the user asks otherwise.

## Golden rules

1. The report discusses only the stock. Never mention data providers, connectors, APIs, MCP, sync errors, parsing issues, raw payloads or app internals. If evidence is weak, translate that into investment language (for example "valuation confidence is low until the cash-flow statement is verified"), never into pipeline narration.
2. Every financial figure is tied to a period (Q1 FY27, FY26, TTM) or labelled as approximate/unverified. No floating numbers.
3. Facts and judgments stay separate. Tables carry facts with an "Interpretation" column; prose carries judgment.
4. The verdict is calibrated, never absolute. Use ranges and conditions ("watchlist / accumulate only with valuation discipline"), not "buy now" or "guaranteed multibagger". Never output 0/100 or 100/100 probabilities.
5. Both directions are always argued. Every bull pillar has a bear counterpart; a trap analysis is mandatory even for stocks the analyst likes.
6. The mechanical numbers in the packet's `legacyAppHeuristics` block are app-generated heuristics, not evidence. Ignore them when forming conclusions.
7. Critical financial and ownership metrics must be backed by the packet's `criticalMetrics` provenance block. If a critical metric has no unit, period, source, or confidence, do not use it in the primary financial table.
8. Segment analysis is mandatory whenever the packet's `segmentAnalysis.required` is true. Do not assign business quality or valuation confidence until segment economics are discussed.
9. The final score must be explained through the packet's `scoringRationale`; opaque scores are not acceptable.

## Report header

Title line: `<COMPANY NAME> - Institutional Stock Research Report`

Then a compact header block:

```
Company: <full legal name>
Ticker: <TICKER>
Report date: <DD Month YYYY>
Research posture: <e.g. High-growth watchlist candidate>
Investment stance: <one line, e.g. Attractive business momentum, but valuation discipline required>
Conviction score: <n> / 100
Multibagger potential: <n> / 100
Potential trap risk: <n> / 100
```

Header fields must be plain text exactly in this style, not bold markdown such as `**Company:**`. The QC and premium PDF renderer use these header lines for score and cover-page extraction.

The three scores are the analyst's own calibrated judgment (typical range 20-80; extremes need extraordinary evidence).

## Section structure (numbered, in this order)

1. **Executive Verdict** — three to five paragraphs. What the company is, why the stock matters now, the tension in the investment case, and a "Final view" paragraph that states the classification (watchlist / accumulate / avoid / trap-risk) in plain language.
2. **Business Overview** — what the company actually makes and for whom; end-markets; why the business is or is not commodity-like; the newest growth vector and its strategic significance.
3. **Investment Thesis** — "The investment case rests on N pillars", each pillar as a numbered subsection (3.1, 3.2, ...) with a short argued paragraph. Typical pillars: niche/moat, capacity-led growth, operating leverage, balance sheet, optionality.
4. **Financial Performance** — a markdown table with columns: Metric | latest period | prior period | full year | Interpretation. Rows: revenue, total income, PAT, EPS, EBITDA margin (plus whatever the evidence supports). Follow the table with prose on what the numbers mean and one honest caveat (for example "one quarter does not establish a permanent margin structure").
5. **Financial Quality** — bullet list of strengths, bullet list of monitoring areas, then `Financial quality score: n / 10`.
6. **Industry Opportunity** — runway, structural drivers, the exciting part of the theme and the risk that the market is over-extrapolating it. Ends with `Industry runway score: n / 10`.
7. **Management And Execution** — strategy logic, the specific outcomes execution will be judged on (numbered list), governance caveats. Ends with `Management and governance score: n / 10`.
8. **Ownership Quality** — promoter holding with level and trend, institutional depth, float, interpretation both ways. Ends with `Ownership score: n / 10`.
9. **Valuation** — the hardest-hitting section. State the multiple honestly across bases (FY EPS, annualized quarter, TTM). Then a **Valuation Scenarios** markdown table: Scenario | Business outcome | EPS potential | Reasonable multiple | Implied price range | Probability, with Bear/Base/Bull rows summing to 100%. Scenario EPS and multiples must be defended in the row, not asserted. Ends with `Valuation score: n / 10`.
10. **Multibagger Potential** — why the ingredients are or are not present, then two subsections: "What Must Happen For 5x Potential" (bullet list of concrete operational requirements with numbers) and "What Must Happen For 10x Potential" (usually a higher bar, honestly assessed). Ends with three summary lines: `Multibagger probability:`, `5x potential:`, `10x potential:`.
11. **Potential Trap Analysis** — which classic trap types (debt, accounting, governance, valuation, momentum) apply or do not, then a "Trap Warning Signs" bullet list of observable triggers. Ends with `Trap verdict: <one line>`.
12. **Catalysts** — markdown table: Catalyst | Timing | Investment significance.
13. **Key Risks** — markdown table: Risk | Probability | Impact | Monitoring trigger.
14. **Stock Monitoring Checklist** — question-form bullets the investor answers after every quarterly result.
15. **Final Recommendation** — the classification restated with reasoning, then structured closing lines: `Recommended stance:`, `Best investor fit:`, `Not suitable for:`, `Upgrade trigger:`, `Downgrade trigger:`, and a closing paragraph that is candid about what the evidence does and does not support.

## Style

Currency in INR crore for company financials and INR for per-share figures. Indian-market conventions (promoter holding, FII/DII, SAST, pledges). Confident, plain, non-promotional prose; short paragraphs; no hedging filler. British/Indian financial vocabulary (capex, concall, rerating/derating). The report should read as if written by a senior buy-side analyst for an investment committee.

## Publishing format

Publish each report as `public/reports/<TICKER>.json` (UTF-8; a BOM is tolerated by the app but plain UTF-8 is preferred):

```json
{
  "title": "<COMPANY> - IMRS Final Stock Research Report - <YYYY-MM-DD>",
  "ticker": "<TICKER>",
  "companyName": "<COMPANY>",
  "asOfDate": "<YYYY-MM-DD>",
  "reportType": "stock-only-final-report",
  "format": "markdown",
  "criticalMetrics": {
    "revenue": {
      "key": "revenue",
      "label": "Revenue",
      "value": "<number as string>",
      "unit": "INR crore",
      "period": "<FY/TTM/Quarter/As-of date>",
      "periodType": "FY",
      "asOf": "<YYYY-MM-DD or source period>",
      "source": "nse",
      "confidence": "verified",
      "notes": []
    }
  },
  "criticalMetricSummary": {
    "available": 0,
    "verifiedOrDerived": 0,
    "missing": [],
    "unverified": [],
    "readyForPrimaryTable": [],
    "mustVerifyBeforeUse": []
  },
  "segmentAnalysis": {
    "required": true,
    "status": "partial",
    "knownSegments": [],
    "codexMustAnalyze": []
  },
  "scoringRationale": {
    "convictionScoreBasis": [],
    "multibaggerScoreBasis": [],
    "trapRiskBasis": [],
    "scorecardRationale": []
  },
  "report": "<the full markdown report>"
}
```

The `report` field carries the markdown. After commit and Vercel deploy, the app's **Report → Fetch Generated Report** button retrieves it by ticker, and **Export PDF** renders the markdown (headings, bold, tables, lists) directly. For the premium PDF, run `python tools/render_report_pdf.py public/reports/<TICKER>.json <TICKER>.pdf` with WeasyPrint installed.
