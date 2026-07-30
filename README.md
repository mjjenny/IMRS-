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

## Kite Market Data

Company search runs through the app backend at:

```text
/api/company-search
```

Search uses Kite Connect's instrument master. To add live LTP, add these environment variables in Vercel:

```text
KITE_API_KEY
KITE_API_SECRET
```

In the Kite developer console, set the redirect URL to:

```text
https://imrs-omega.vercel.app/api/kite/callback
```

Then open IMRS, go to the Kite page, and click Connect Kite. Kite access tokens are session based, so reconnect after the token expires.

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

## OpenAI Analyst Reports

IMRS can generate a fuller analyst-style stock research report from the saved Kite, NSE and Trendlyne data. Add this environment variable in Vercel:

```text
OPENAI_API_KEY
```

Optional:

```text
OPENAI_MODEL
```

If `OPENAI_MODEL` is not set, IMRS uses `gpt-5-mini`. The OpenAI key is used only from the server route:

```text
/api/ai/report
```

The browser never receives the API key. The report page still works without OpenAI by using the rule-based IMRS report.

## Final Research Reports

IMRS is now designed as an evidence collector and report library. The preferred workflow is:

```text
Search company > Data Hub sync > Report > Export Rich Packet > Codex writes stock-only report > Fetch Generated Report
```

The final report should discuss only the stock. It should not expose provider names, raw payloads, reconciliation notes, app errors or data-pipeline details to the reader.

The exported packet is intentionally different from a normal app backup. It contains cleaned, analyst-ready sections: company profile, validated financial metrics with units and periods, ownership evidence, market and event evidence, saved research notes, risk/catalyst trackers, scorecard, valuation sanity checks and a report brief for Codex. Raw table dumps are suppressed from the primary packet so the final report starts from readable evidence instead of connector output.

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

## Data Automation Roadmap

Current automated sources:

```text
Kite Connect: instruments and live LTP
NSE: shareholding pattern summary
NSE: annual financial-result filings
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
Kite: price, OHLC, volume, instruments
NSE/BSE: exchange filings, shareholding, results, XBRL links
Trendlyne: richer fundamentals, ratios, DVM/analyst/ownership data if official export/API access is available
```

The old single-file version is preserved at:

```text
legacy/index.html
```
