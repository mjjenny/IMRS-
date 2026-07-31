param(
  [Parameter(Mandatory = $true)]
  [string]$Report,

  [switch]$SkipPdf,
  [switch]$SkipBuild,
  [switch]$Commit,
  [switch]$Push,
  [string]$Message
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$reportPath = Resolve-Path $Report
$payload = Get-Content -LiteralPath $reportPath.Path -Raw -Encoding UTF8 | ConvertFrom-Json
$ticker = if ($payload.ticker) { [string]$payload.ticker } else { [IO.Path]::GetFileNameWithoutExtension($reportPath.Path) }

Write-Host "Running IMRS report quality gate for $ticker..."
python tools/qc_report.py $reportPath.Path --strict

if (-not $SkipPdf) {
  $outDir = Join-Path $repoRoot "report-output"
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  $pdfPath = Join-Path $outDir "$ticker-IMRS-Research-Report.pdf"
  Write-Host "Rendering premium PDF..."
  python tools/render_report_pdf.py $reportPath.Path $pdfPath
}

if (-not $SkipBuild) {
  Write-Host "Checking application quality..."
  npm run lint
  npm run build
}

if ($Commit) {
  $relativeReport = Resolve-Path -Relative $reportPath.Path
  if (-not $Message) {
    $Message = "Publish $ticker final stock research report"
  }
  Write-Host "Committing only $relativeReport..."
  git add -- $relativeReport
  git commit -m $Message
}

if ($Push) {
  Write-Host "Pushing to GitHub..."
  git push origin main
}

Write-Host "Report pipeline complete."
