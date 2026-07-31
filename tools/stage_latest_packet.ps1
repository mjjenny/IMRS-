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

Copy-Item -LiteralPath $latest.FullName -Destination $destination -Force
Copy-Item -LiteralPath $latest.FullName -Destination $latestPointer -Force

$message = @"
Latest IMRS packet staged for Codex.

Source:
$($latest.FullName)

Staged file:
$destination

Stable latest path:
$latestPointer

Prompt to Codex:
Use the staged packet at $latestPointer and publish the final stock-only IMRS report.
"@

Write-Output $message

try {
  Set-Clipboard -Value "Use the staged packet at $latestPointer and publish the final stock-only IMRS report."
} catch {
  # Clipboard access is optional.
}
