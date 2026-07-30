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

After the available tool names are confirmed from your subscription, the next route will map Trendlyne's financials, ratios, ownership and DVM tools into IMRS company fields automatically.

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
