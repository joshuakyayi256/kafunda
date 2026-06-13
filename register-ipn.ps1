# =============================================================================
# Kafunda - One-time Pesapal LIVE IPN registration (PowerShell, ASCII-safe)
# =============================================================================
# Reads PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET from .env.local
# (verified LIVE by test-pesapal-keys.ps1), registers the IPN URL once on
# pay.pesapal.com, and prints the ipn_id to set in Vercel as PESAPAL_IPN_ID.
#
# Run from the project root, AFTER the production deploy is reachable at
# kafundawines.com (Pesapal needs a publicly available IPN URL):
#   1. Rename this file to register-ipn.ps1
#   2. powershell -ExecutionPolicy Bypass -File .\register-ipn.ps1
#
# The IPN route reads query params, so we register as GET (matches
# src/app/api/checkout/pesapal/ipn/route.ts).
#
# To see what is already registered on the account (e.g. checking for
# duplicates from old cold-start registrations):
#   GET https://pay.pesapal.com/v3/api/URLSetup/GetIpnList  (Bearer token)
# =============================================================================

$EnvFile = ".\.env.local"
$IpnUrl  = "https://kafundawines.com/api/checkout/pesapal/ipn"
$Base    = "https://pay.pesapal.com/v3"

if (-not (Test-Path $EnvFile)) {
  Write-Host "Could not find $EnvFile - run this from the project root." -ForegroundColor Red
  exit 1
}

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

Write-Host "1/2  Requesting Pesapal LIVE token (key $($Key.Substring(0,6))...)" -ForegroundColor Cyan
$tokenBody = @{ consumer_key = $Key; consumer_secret = $Secret } | ConvertTo-Json
$tokenRes  = Invoke-RestMethod -Method Post -Uri "$Base/api/Auth/RequestToken" `
  -ContentType "application/json" -Headers @{ Accept = "application/json" } -Body $tokenBody

if (-not $tokenRes.token) {
  Write-Host "Token refused:" -ForegroundColor Red
  $tokenRes | ConvertTo-Json -Depth 5
  exit 1
}

Write-Host "2/2  Registering IPN URL (GET): $IpnUrl" -ForegroundColor Cyan
$ipnBody = @{ url = $IpnUrl; ipn_notification_type = "GET" } | ConvertTo-Json
$ipnRes  = Invoke-RestMethod -Method Post -Uri "$Base/api/URLSetup/RegisterIPN" `
  -ContentType "application/json" `
  -Headers @{ Accept = "application/json"; Authorization = "Bearer $($tokenRes.token)" } `
  -Body $ipnBody

$ipnRes | ConvertTo-Json -Depth 5

if ($ipnRes.ipn_id) {
  Write-Host ""
  Write-Host "================================================================" -ForegroundColor Green
  Write-Host "  SUCCESS - set this in Vercel (Production) and redeploy:"        -ForegroundColor Green
  Write-Host ""
  Write-Host "  PESAPAL_IPN_ID=$($ipnRes.ipn_id)"                               -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  Also add the same line to .env.local for local testing."        -ForegroundColor Green
  Write-Host "================================================================" -ForegroundColor Green
} else {
  Write-Host "Registration did not return an ipn_id - see response above." -ForegroundColor Red
}