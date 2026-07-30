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

## Data Automation Roadmap

Current automated sources:

```text
Kite Connect: instruments and live LTP
NSE: shareholding pattern summary
```

Current upload fallback:

```text
Screener Excel: historical financial statements and derived ratios
NSE CSV: shareholding pattern if NSE sync fails
```

For fully automated fundamentals, use a licensed provider or an official export workflow such as Trendlyne Excel Connect/Data Downloader or a dedicated financial-data API. Avoid scraping subscription websites.

The old single-file version is preserved at:

```text
legacy/index.html
```
