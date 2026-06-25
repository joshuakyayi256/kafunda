# ============================================================================
#  Kafunda  apply client-revision fixes (June 2026)
#  Run from the project root:  D:\Coding Projects\kafunda
#
#  WHAT IT DOES (safe, mechanical only):
#   1. Backs up every file it will touch into _backup_<timestamp>\
#   2. Copies the finished drop-in files from .\dropin\ to their real paths
#   3. Patches the Navbar CATEGORIES array (the Soft Drinks / Whisky bug)
#   4. Reminds you to clear .next and test
#
#  BEFORE RUNNING:
#   - Put ALL the drop-in files I gave you into a folder:  .\dropin\
#     (shop-page.tsx, ShopFilters.tsx, CategoryGrid.tsx, BrandMarquee.tsx,
#      Footer.tsx, checkout-page.tsx)
#   - This script does NOT touch globals.css or the red color (needs your hex).
# ============================================================================

$ErrorActionPreference = "Stop"
$root = Get-Location
$dropin = Join-Path $root "dropin"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root "_backup_$stamp"

Write-Host ""
Write-Host "=== Kafunda fix applier ===" -ForegroundColor Cyan
Write-Host "Project root: $root"
Write-Host ""

if (-not (Test-Path $dropin)) {
    Write-Host "ERROR: dropin folder not found." -ForegroundColor Red
    Write-Host "Create '$dropin' and put the drop-in .tsx files there first." -ForegroundColor Yellow
    exit 1
}

New-Item -ItemType Directory -Force -Path $backup | Out-Null
Write-Host "Backups -> $backup" -ForegroundColor DarkGray
Write-Host ""

# -- File map: dropin filename -> real destination path ----------------------
$map = @{
    "shop-page.tsx"     = "src\app\shop\page.tsx"
    "ShopFilters.tsx"   = "src\components\shared\ShopFilters.tsx"
    "CategoryGrid.tsx"  = "src\components\shared\CategoryGrid.tsx"
    "BrandMarquee.tsx"  = "src\components\shared\BrandMarquee.tsx"
    "Footer.tsx"        = "src\components\layout\Footer.tsx"
    "checkout-page.tsx" = "src\app\checkout\page.tsx"
}

foreach ($src in $map.Keys) {
    $srcPath = Join-Path $dropin $src
    $dstPath = Join-Path $root $map[$src]

    if (-not (Test-Path $srcPath)) {
        Write-Host "SKIP  $src  (not in dropin)" -ForegroundColor DarkYellow
        continue
    }

    # back up existing destination
    if (Test-Path $dstPath) {
        $bdir = Join-Path $backup (Split-Path $map[$src] -Parent)
        New-Item -ItemType Directory -Force -Path $bdir | Out-Null
        Copy-Item $dstPath -Destination (Join-Path $backup $map[$src]) -Force
    } else {
        # ensure destination folder exists
        New-Item -ItemType Directory -Force -Path (Split-Path $dstPath -Parent) | Out-Null
    }

    Copy-Item $srcPath -Destination $dstPath -Force
    Write-Host "OK    $($map[$src])" -ForegroundColor Green
}

# -- Patch the Navbar CATEGORIES array (the slug bug) ------------------------
# Find the Navbar file that contains the CATEGORIES const with Soft-Drinks.
Write-Host ""
Write-Host "Patching Navbar CATEGORIES..." -ForegroundColor Cyan

$navCandidates = Get-ChildItem -Recurse -Path (Join-Path $root "src\components") -Filter *.tsx |
    Select-String -Pattern 'category=Soft-Drinks' -List |
    Select-Object -ExpandProperty Path -Unique

if (-not $navCandidates) {
    Write-Host "  No file with 'category=Soft-Drinks' found  maybe already fixed. Skipping." -ForegroundColor DarkYellow
} else {
    foreach ($nav in $navCandidates) {
        # back it up
        $rel = $nav.Substring($root.Path.Length).TrimStart('\')
        $bdir = Join-Path $backup (Split-Path $rel -Parent)
        New-Item -ItemType Directory -Force -Path $bdir | Out-Null
        Copy-Item $nav -Destination (Join-Path $backup $rel) -Force

        $content = Get-Content $nav -Raw

        # Targeted replacements: only the wrong hrefs, nothing else.
        $content = $content -replace 'category=Soft-Drinks', 'category=Soft Drinks'
        $content = $content -replace 'category=Whisky"',     'category=Whiskys"'
        $content = $content -replace 'category=Champagne"',  'category=Champagnes"'

        Set-Content -Path $nav -Value $content -NoNewline -Encoding UTF8
        Write-Host "  OK  patched $rel" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Remove-Item -Recurse -Force .next"
Write-Host "  2. npm run dev"
Write-Host "  3. Click 'Soft Drinks' in the top menu -> products should load"
Write-Host "  4. /shop -> pick 'Under 50,000' -> cheap items should show"
Write-Host ""
Write-Host "Backups are in: $backup" -ForegroundColor DarkGray
Write-Host "If anything looks wrong, copy files back from there." -ForegroundColor DarkGray
