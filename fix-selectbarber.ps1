# PowerShell script to fix selectBarber function in owner-app.html

$filePath = ".\owner-app.html"

# Read the file
$content = Get-Content $filePath -Raw

# Fix the console.warn line and default barber fallback
$oldPattern = "console.warn``(``${'$'}Barber `${'$'}{barberId} not found, using default``);`r?`n\s+barber = barbers\[0\] \|\| \{ id: 'owner', name: 'Owner', isOwner: true \};"

$newReplacement = @"
console.warn(```$Barber `${barberId} not found, using first barber (owner)``);
                    if (barbers.length > 0) {
                        barber = barbers[0];
                        window.currentBarberId = barber.id;
                    } else {
                        barber = { id: null, name: 'Owner', isOwner: true };
                    }
"@

# Replace the pattern
$content = $content -replace $oldPattern, $newReplacement

# Also add check at beginning of selectBarber function
$functionPattern = "function selectBarber\(barberId\) \{`r?`n\s+window\.currentBarberId = barberId;"

$functionReplacement = @"
function selectBarber(barberId) {
                // If no barberId provided or it's 'owner', select the first barber (owner)
                if (!barberId || barberId === 'owner') {
                    if (barbers.length > 0) {
                        barberId = barbers[0].id;
                    }
                }

                window.currentBarberId = barberId;
"@

$content = $content -replace $functionPattern, $functionReplacement

# Save the file
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "✅ Successfully updated selectBarber function!" -ForegroundColor Green
Write-Host ""
Write-Host "Changes made:" -ForegroundColor Yellow
Write-Host "1. Added check for null/undefined barberId at function start" -ForegroundColor Cyan
Write-Host "2. Changed fallback to use first barber instead of hardcoded 'owner'" -ForegroundColor Cyan
Write-Host "3. Updated console warning message" -ForegroundColor Cyan
Write-Host ""
Write-Host "The owner app should now work correctly without warnings!" -ForegroundColor Green