param()

$CacheDir    = Join-Path $env:USERPROFILE ".cache\innfo-mcp"
$VersionFile = Join-Path $CacheDir "current-version.txt"
$BundleFile  = Join-Path $CacheDir "innfo-mcp.bundle.js"
$ManifestUrl = "https://innfo.cognnitive.com/cdn/manifest.json"

$null = New-Item -ItemType Directory -Path $CacheDir -Force

$latest = $null
try {
    $manifest = Invoke-WebRequest -Uri $ManifestUrl -TimeoutSec 3 -UseBasicParsing
    $latest = ($manifest.Content | ConvertFrom-Json).latest
} catch {
    Write-Warning "Cannot reach $ManifestUrl — using cached bundle"
}

if ($latest) {
    $cached = if (Test-Path $VersionFile) { (Get-Content $VersionFile -Raw).Trim() } else { $null }
    if ($latest -ne $cached) {
        Write-Host "Downloading innfo-mcp $latest..."
        $bundleUrl = "https://innfo.cognnitive.com/cdn/innfo-mcp-$latest.bundle.js"
        Invoke-WebRequest -Uri $bundleUrl -OutFile $BundleFile
        Set-Content -Path $VersionFile -Value $latest
        Write-Host "Done."
    }
} elseif (-not (Test-Path $BundleFile)) {
    Write-Error "No internet and no cached bundle. Run with internet first."
    exit 1
}

& node $BundleFile $args
exit $LASTEXITCODE
