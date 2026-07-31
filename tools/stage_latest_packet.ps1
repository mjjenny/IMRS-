param(
  [string]$Downloads = "$env:USERPROFILE\Downloads",
  [string]$Inbox = "tmp\codex-inbox",
  [string]$Ticker = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$downloadsPath = Resolve-Path $Downloads
$inboxPath = Join-Path $repoRoot $Inbox

if (!(Test-Path $inboxPath)) {
  New-Item -ItemType Directory -Path $inboxPath | Out-Null
}

$safeTicker = $Ticker.Trim().ToUpperInvariant()
$pattern = if ($safeTicker) {
  "$safeTicker-IMRS-Codex-Research-Packet-*.json"
} else {
  "*-IMRS-Codex-Research-Packet-*.json"
}

$latest = Get-ChildItem -LiteralPath $downloadsPath -Filter $pattern -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$latest) {
  throw "No IMRS research packet found in $downloadsPath using pattern $pattern"
}

$destination = Join-Path $inboxPath $latest.Name
$latestPointer = Join-Path $inboxPath "latest-packet.json"
$promptPath = Join-Path $inboxPath "latest-prompt.txt"
$signalPath = Join-Path $inboxPath "latest-signal.json"

Copy-Item -LiteralPath $latest.FullName -Destination $destination -Force
Copy-Item -LiteralPath $latest.FullName -Destination $latestPointer -Force

$packet = Get-Content -LiteralPath $latest.FullName -Raw | ConvertFrom-Json
$ticker = if ($packet.companyProfile.ticker) { $packet.companyProfile.ticker } else { "IMRS" }
$target = if ($packet.codexWorkflow.finalReportTarget) { $packet.codexWorkflow.finalReportTarget } else { "public/reports/$ticker.json" }
$prompt = "Use the staged packet at $latestPointer and publish the final stock-only IMRS report."
$signal = [ordered]@{
  status = "ready_for_codex"
  ticker = $ticker
  receivedAt = (Get-Date).ToUniversalTime().ToString("o")
  packetPath = $destination
  latestPath = $latestPointer
  prompt = $prompt
  expectedReportPath = $target
}

Set-Content -LiteralPath $promptPath -Value $prompt -Encoding UTF8
$signal | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $signalPath -Encoding UTF8

$message = @"
Latest IMRS packet staged for Codex.

Source:
$($latest.FullName)

Staged file:
$destination

Stable latest path:
$latestPointer

Signal:
$signalPath

Prompt to Codex:
$prompt
"@

Write-Output $message

try {
  Set-Clipboard -Value $prompt
} catch {
  # Clipboard access is optional.
}
