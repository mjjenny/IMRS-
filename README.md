# IMRS Enterprise

Institutional Multibagger Research System, migrated from the original one-file prototype into a React/Next.js application.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Check Before Deploying

```bash
npm run lint
npm run build
npm audit --omit=dev
```

## Deployment

This repository is already connected to the existing Vercel project. After changes are pushed to `main`, Vercel should redeploy the same live app URL.

## Company Search

Company search runs through the app backend at:

```text
/api/company-search
```

Search now combines the NSE equity universe with BSE active equity securities. Create the company record from search, then use the Data page to sync richer evidence.

## Screener Fundamentals

Use the Fundamentals page to upload Screener company Excel exports. IMRS reads the workbook's `Data Sheet`, stores the latest fundamentals locally, and auto-fills matching imported companies.

The importer currently fills:

```text
Market cap, revenue, profit, EPS, P/E, ROE, ROCE, debt/equity, sales growth, profit growth, OPM, operating cash flow
```

Promoter holding is not present in the tested Screener company workbook, so it remains manual.

## NSE Shareholding Pattern

IMRS automatically attempts to sync promoter holding from NSE when an NSE company is imported from search. It uses:

```text
/api/nse/shareholding
```

This route fetches the exchange shareholding feed server-side and returns the latest promoter/public holding fields to the app.

The Fundamentals page also keeps a manual fallback for NSE shareholding pattern CSV files from:

```text
NSE > Corporate Filings > Shareholding Pattern > Download CSV
```

The importer currently fills:

```text
Promoter holding %, public holding %, employee trust holding %, as-on date, submission date, XBRL source link
```

This is the preferred source for promoter holding because it comes from the exchange filing rather than the Screener workbook.

## NSE Financial Results

IMRS automatically attempts to sync annual NSE financial-result filings when an NSE company is imported from search. It uses:

```text
/api/nse/financials
```

The current importer fills:

```text
Revenue, profit, EPS, sales growth, profit growth, operating margin, report date
```

It does not yet fill ROE, ROCE, debt/equity or operating cash flow because those require balance-sheet and cash-flow statement detail.

## Trendlyne Rich Fundamentals

Use the Fundamentals page to upload Trendlyne Excel Connect/Data Downloader CSV or XLSX exports. IMRS maps matching columns into the company record.

The importer is designed to fill these richer fields when they are present in the export:

```text
ROE, ROCE, debt/equity, operating cash flow, FII holding, DII holding, institutional holding, DVM durability, DVM valuation, DVM momentum, analyst score
```

This is the official-subscription route. IMRS does not scrape Trendlyne pages or store your Trendlyne login. If Trendlyne provides an official API token or live export URL in your account, it can be added later as a background sync.

## Trendlyne MCP Connector

Trendlyne MCP can be connected server-side from the Next.js backend. Add the MCP URL from your Trendlyne MCP subscription in Vercel:

```text
TRENDLYNE_MCP_URL
```

If Trendlyne provides a bearer token or API key, add whichever one they provide:

```text
TRENDLYNE_MCP_TOKEN
TRENDLYNE_MCP_API_KEY
```

Then open IMRS > Fundamentals > Trendlyne MCP and click Check MCP. The app will connect from the backend, list Trendlyne's available MCP tools, and keep the URL/token hidden from the browser.

The first MCP route is:

```text
/api/trendlyne/status
```

The live company sync route is:

```text
/api/trendlyne/company?symbol=RELIANCE
```

IMRS calls Trendlyne's entity search, structured parameter, ownership/shareholding and overview tools, then maps the response into the selected company. Use IMRS > Fundamentals > Sync Trendlyne after selecting or importing a company.

The full intelligence route is:

```text
/api/trendlyne/intelligence?symbol=RELIANCE
```

This calls Trendlyne's overview, technical, news, corporate events, shareholding, SAST/insider, bulk/block deal and document-search tools. The app stores the returned intelligence pack under the selected company's AI Analysis tab.

## Codex Final Reports

IMRS does not generate the final institutional report inside the website. The website collects and organizes evidence; Codex performs the dynamic stock analysis and produces the final stock-only report.

## Final Research Reports

IMRS is now designed as an evidence collector and report library. The preferred workflow is:

```text
Search company > Data Hub sync > Report > Export Rich Packet > Codex writes stock-only report > Fetch Generated Report
```

To avoid manually attaching the exported packet to Codex every time, export the rich packet from the browser and then stage the newest packet from Downloads:

```bash
npm run packet:stage
```

For a specific ticker:

```bash
npm run packet:stage -- -Ticker KAYNES
```

This copies the latest exported packet into:

```text
tmp/codex-inbox/latest-packet.json
```

Then tell Codex:

```text
Use the staged packet at tmp/codex-inbox/latest-packet.json and publish the final stock-only IMRS report.
```

For a smoother workflow, start the local Codex packet bridge before working:

```bash
npm run packet:bridge
```

Leave that terminal window open. After that, when you click **Report > Export Rich Packet** in the browser, IMRS still downloads the packet but also sends a copy directly into:

```text
tmp/codex-inbox/latest-packet.json
```

The browser will show whether auto-staging worked. If it worked, tell Codex:

```text
Use the latest staged packet and publish the report.
```

If the bridge is not running, the normal download still works and `npm run packet:stage` remains the fallback.

The final report should discuss only the stock. It should not expose provider names, raw payloads, reconciliation notes, app errors or data-pipeline details to the reader.

The exported packet is intentionally different from a normal app backup. It contains cleaned, analyst-ready sections: company profile, validated financial metrics with units and periods, ownership evidence, market and event evidence, saved research notes, risk/catalyst trackers, scorecard, valuation sanity checks and a report brief for Codex. Raw table dumps are suppressed from the primary packet so the final report starts from readable evidence instead of connector output.

The rich packet also includes a verification plan for Codex: price/market-cap/EPS/P/E sanity checks, filing checks, a "Codex must verify" checklist, cleaner financial tables, ownership tables, formatted news/catalyst evidence and withheld-metric notes where a figure fails validation.

Codex-generated final reports can be published inside the app at:

```text
public/reports/TICKER.json
```

Example:

```text
public/reports/MTARTECH.json
```

After deployment, open the company record and click:

```text
Report > Fetch Generated Report
```

Manual upload with `Import Final Report` remains available as a fallback.

## PDF Research Reports

For quick browser PDFs after importing a final report, open:

```text
Report > Export PDF
```

In Chrome, choose `Save as PDF` in the print dialog.

For higher-quality Codex-generated PDFs, use the WeasyPrint-ready renderer:

```bash
python tools/render_report_pdf.py path/to/final-report.json path/to/final-report.pdf
```

The renderer accepts the same imported report JSON used by IMRS. It uses WeasyPrint when available and keeps the design focused on a polished institutional stock report.

## Report Quality And Publishing Pipeline

Before publishing a Codex-written final report, run the quality gate:

```bash
npm run report:qc -- public/reports/SAKAR.json --strict
```

The quality gate checks that the report follows `docs/REPORT_TEMPLATE.md`: stock-only language, required institutional sections, calibrated scores, valuation scenarios, and no raw connector or data-pipeline text.

To validate a report, render the premium PDF, run the app checks, commit only that report JSON and push:

```bash
npm run report:publish -- -Report public/reports/SAKAR.json -Commit -Push
```

The publishing script intentionally avoids `git add .`, so loose screenshots, exports or temporary files are not accidentally committed. Generated premium PDFs are written to `report-output/`, which is ignored by Git.

## Data Automation Roadmap

Current automated sources:

```text
NSE: shareholding pattern summary
NSE: annual financial-result filings
Trendlyne MCP: richer market intelligence when configured
```

Current upload fallback:

```text
Screener Excel: historical financial statements and derived ratios
NSE CSV: shareholding pattern if NSE sync fails
Trendlyne export: DVM, analyst, ownership and richer ratio fields
```

For fully automated fundamentals, use a licensed provider or an official export workflow such as Trendlyne Excel Connect/Data Downloader or a dedicated financial-data API. Avoid scraping subscription websites.

Target production stack:

```text
NSE/BSE: exchange filings, shareholding, results, XBRL links
Trendlyne: richer fundamentals, ratios, DVM/analyst/ownership data if official export/API access is available
Codex: dynamic stock-only research report generation from the exported evidence packet
```

The old single-file version is preserved at:

```text
legacy/index.html
```
