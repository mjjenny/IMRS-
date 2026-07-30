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

## Market Data

Company search runs through the app backend at:

```text
/api/company-search
```

Without an API key, it uses the built-in starter directory. To enable live symbol search, add this environment variable in Vercel:

```text
TWELVE_DATA_API_KEY
```

Then redeploy the project.

The old single-file version is preserved at:

```text
legacy/index.html
```
