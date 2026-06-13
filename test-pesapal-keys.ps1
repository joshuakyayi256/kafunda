# =============================================================================
# Kafunda - Pesapal key diagnostic (PowerShell, ASCII-safe)
# =============================================================================
# Reads PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET straight from
# .env.local (no copy-pasting keys), then requests a token from BOTH the
# LIVE and SANDBOX Pesapal v3 endpoints and prints a plain verdict.
#
# Run from the project root (D:\Coding Projects\kafunda):
#   1. Rename this file to test-pesapal-keys.ps1
#   2. powershell -ExecutionPolicy Bypass -File .\test-pesapal-keys.ps1
# =============================================================================

$EnvFile = ".\.env.local"

if (-not (Test-Path $EnvFile)) {
  Write-Host "Could not find $EnvFile - run this from the project root." -ForegroundColor Red
  exit 1
}

# -- Parse .env.local (KEY=value, ignores comments, strips quotes/whitespace) --
$envMap = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $idx = $line.IndexOf("=")
    $k = $line.Substring(0, $idx).Trim()
    $v = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
    $envMap[$k] = $v
  }
}

$Key    = $envMap["PESAPAL_CONSUMER_KEY"]
$Secret = $envMap["PESAPAL_CONSUMER_SECRET"]

if (-not $Key -or -not $Secret) {
  Write-Host "PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET not found in .env.local" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Found key:    $($Key.Substring(0, [Math]::Min(6, $Key.Length)))... (length $($Key.Length))"
Write-Host "Found secret: $($Secret.Substring(0, [Math]::Min(4, $Secret.Length)))... (length $($Secret.Length))"
Write-Host ""

$body = @{ consumer_key = $Key; consumer_secret = $Secret } | ConvertTo-Json

function Test-Endpoint($label, $url) {
  try {
    $res = Invoke-RestMethod -Method Post -Uri $url `
      -ContentType "application/json" -Headers @{ Accept = "application/json" } -Body $body
    if ($res.token) {
      Write-Host "[$label]  ACCEPTED - token issued." -ForegroundColor Green
      return $true
    }
    Write-Host "[$label]  REJECTED - $($res.error.code)" -ForegroundColor Yellow
    return $false
  } catch {
    Write-Host "[$label]  REQUEST FAILED - $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

$live    = Test-Endpoint "LIVE    pay.pesapal.com " "https://pay.pesapal.com/v3/api/Auth/RequestToken"
$sandbox = Test-Endpoint "SANDBOX cybqa.pesapal.com" "https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken"

Write-Host ""
Write-Host "================ VERDICT ================" -ForegroundColor Cyan
if ($live) {
  Write-Host "These are LIVE API 3.0 keys. You are good - run register-ipn.ps1 next"  -ForegroundColor Green
  Write-Host "(after the production deploy is reachable at kafundawines.com)."        -ForegroundColor Green
} elseif ($sandbox) {
  Write-Host "These are SANDBOX/DEMO keys. The WordPress plugin was in test mode."    -ForegroundColor Yellow
  Write-Host "ACTION: get the LIVE API 3.0 consumer key + secret from the Pesapal"    -ForegroundColor Yellow
  Write-Host "merchant dashboard (or Pesapal support) - Deborah's account."           -ForegroundColor Yellow
} else {
  Write-Host "Rejected by BOTH environments. Most likely these are old API 2.0"       -ForegroundColor Yellow
  Write-Host "keys from an older WordPress plugin (a different key family that v3"    -ForegroundColor Yellow
  Write-Host "never accepts), or the values were truncated when copied."              -ForegroundColor Yellow
  Write-Host "ACTION: in wp-admin check the Pesapal plugin version/settings, and"     -ForegroundColor Yellow
  Write-Host "request fresh API 3.0 credentials from the Pesapal merchant account."   -ForegroundColor Yellow
}
Write-Host "========================================="  -ForegroundColor Cyan