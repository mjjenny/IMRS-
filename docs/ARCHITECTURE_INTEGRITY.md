# IMRS Architecture Integrity Notes

## Current shape

IMRS is a Next.js App Router application. The browser app is currently concentrated in `app/page.tsx`; backend data connectors live under `app/api`; local publishing helpers live under `tools`.

## Stable boundaries

- `app/api/company-search`: NSE/BSE listed-company discovery.
- `app/api/nse`: NSE filing sync for financial results and shareholding, with machine-readable filing text enrichment where an XBRL/text URL is available.
- `app/api/bse`: BSE filing sync for header financials and shareholding, with machine-readable filing text enrichment where an XBRL/text URL is available.
- `app/api/trendlyne`: market-intelligence connector.
- `tools/qc_report.py`: strict stock-only report quality gate.
- `tools/render_report_pdf.py`: premium PDF rendering.
- `tools/publish_report.ps1`: report QC, PDF rendering and optional commit/push.
- `tools/extract_bse_pdf_financials.py`: conservative BSE PDF/text/XBRL-style filing extraction into candidate metrics for verification.
- `tools/codex_packet_bridge.mjs`: local packet bridge from browser to Codex inbox.
- `public/reports`: published final stock-only reports.

## Change rules

1. Final reports must pass `npm run report:qc -- public/reports/<TICKER>.json --strict`.
2. Report-only publishing should use `npm run report:publish -- --Report public/reports/<TICKER>.json -Commit -Push`; this runs report QC and PDF rendering without rebuilding the app.
3. App changes must pass `npm run lint`, `npm run build` and `npm run smoke`.
4. Reader-facing reports must not mention provider names, connector internals, parsing issues or raw data fragments.
5. Imported evidence can be incomplete; final reports must translate evidence quality into investment judgement, not data-pipeline narration.
6. New rich packets should include `criticalMetrics`, `criticalMetricSummary`, `segmentAnalysis`, `scoringRationale` and `evidenceQualityBoard`.
7. Do not expand `app/page.tsx` with new major workflows. New work should move toward small components and helpers.
8. NSE/BSE financial sync should prefer structured API fields, then use filing/XBRL text extraction only as provenance-tagged candidate evidence. Candidate values must remain visible in the evidence packet and should not silently override cleaner direct fields.

## Refactor target

The next safe refactor should split `app/page.tsx` into:

- `app/components/AppShell.tsx`
- `app/components/SearchPanel.tsx`
- `app/components/DataHub.tsx`
- `app/components/ReportPanel.tsx`
- `app/lib/company-matching.ts`
- `app/lib/report-packet.ts`
- `app/lib/storage.ts`

This refactor should be mechanical only: no product behaviour changes in the same commit.
