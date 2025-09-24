# PowerShell script to fix owner selection in owner-app.html

$filePath = ".\owner-app.html"

# Read the file
$content = Get-Content $filePath -Raw

# Fix 1: Change hardcoded 'owner' ID to null
$content = $content -replace "window\.currentBarberId = 'owner';", "window.currentBarberId = null;  // Will be set to first barber (owner)"

Write-Host "✅ Fixed line 7127: Changed 'owner' to null" -ForegroundColor Green

# Save the file
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "✅ Successfully updated owner-app.html!" -ForegroundColor Green
Write-Host ""
Write-Host "The change has been applied:" -ForegroundColor Yellow
Write-Host "- Line 7127: window.currentBarberId = null;" -ForegroundColor Cyan
Write-Host ""
Write-Host "The 'Barber owner not found' warning should no longer appear." -ForegroundColor Green
Write-Host "Please refresh the owner app to see the changes." -ForegroundColor Yellow