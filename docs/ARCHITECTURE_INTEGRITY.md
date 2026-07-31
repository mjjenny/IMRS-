# IMRS Architecture Integrity Notes

## Current shape

IMRS is a Next.js App Router application. The browser app is currently concentrated in `app/page.tsx`; backend data connectors live under `app/api`; local publishing helpers live under `tools`.

## Stable boundaries

- `app/api/company-search`: NSE/BSE listed-company discovery.
- `app/api/nse`: NSE filing sync for financial results and shareholding.
- `app/api/bse`: BSE filing sync for header financials and shareholding.
- `app/api/trendlyne`: market-intelligence connector.
- `tools/qc_report.py`: strict stock-only report quality gate.
- `tools/render_report_pdf.py`: premium PDF rendering.
- `tools/codex_packet_bridge.mjs`: local packet bridge from browser to Codex inbox.
- `public/reports`: published final stock-only reports.

## Change rules

1. Final reports must pass `npm run report:qc -- public/reports/<TICKER>.json --strict`.
2. App changes must pass `npm run lint`, `npm run build` and `npm run smoke`.
3. Reader-facing reports must not mention provider names, connector internals, parsing issues or raw data fragments.
4. Imported evidence can be incomplete; final reports must translate evidence quality into investment judgement, not data-pipeline narration.
5. Do not expand `app/page.tsx` with new major workflows. New work should move toward small components and helpers.

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
