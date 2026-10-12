# ==============================================================================
# Script to build Android APK using Capacitor and Gradle
# Targets Production: Backend (Render), Cloud DB (Neon), Object Storage (R2)
# ==============================================================================

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $RootDir "frontend"
$AndroidDir = Join-Path $FrontendDir "android"

Write-Host "==> 1. Building Frontend Web Assets for Production..." -ForegroundColor Cyan
Set-Location $FrontendDir
$env:VITE_API_BASE_URL = "https://the-limited-pork.onrender.com/api/v1"
npm run build

Write-Host "==> 2. Syncing Capacitor Android Assets..." -ForegroundColor Cyan
npx cap sync android

Write-Host "==> 3. Compiling Android APK with Gradle..." -ForegroundColor Cyan
Set-Location $AndroidDir

# Ensure local.properties points to Android SDK if present
$SdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $SdkPath) {
    $SdkPathEscaped = $SdkPath -replace '\\', '/'
    Set-Content -Path "local.properties" -Value "sdk.dir=$SdkPathEscaped"
}

cmd.exe /c "gradlew.bat assembleDebug --no-daemon"

$ApkSource = Join-Path $AndroidDir "app\build\outputs\apk\debug\app-debug.apk"
$ApkDestRoot = Join-Path $RootDir "moo-krob-app.apk"
$ApkDestPublic = Join-Path $FrontendDir "public\moo-krob-app.apk"

if (Test-Path $ApkSource) {
    Copy-Item $ApkSource $ApkDestRoot -Force
    Copy-Item $ApkSource $ApkDestPublic -Force
    
    $FileSize = (Get-Item $ApkDestRoot).Length / 1MB
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] Android APK Built Successfully!" -ForegroundColor Green
    Write-Host " Output File: $ApkDestRoot" -ForegroundColor Green
    Write-Host " Public URL File: $ApkDestPublic" -ForegroundColor Green
    Write-Host (" File Size: {0:N2} MB" -f $FileSize) -ForegroundColor Green
    Write-Host " Backend Endpoint: https://the-limited-pork.onrender.com/api/v1" -ForegroundColor Green
    Write-Host " Connected to: Production Cloud DB & Object Storage" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Error "[ERROR] APK file not found at $ApkSource"
}

Set-Location $RootDir
