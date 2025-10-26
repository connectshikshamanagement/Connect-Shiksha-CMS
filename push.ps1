param(
    [string]$Message = "Update: Manual push at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "Manual Git Push" -ForegroundColor Cyan
Write-Host ""

$status = git status --porcelain
if ($null -eq $status -or $status -eq "") {
    Write-Host "No changes to commit" -ForegroundColor Yellow
    exit 0
}

Write-Host "Changes found. Proceeding..." -ForegroundColor Green
Write-Host "Message: $Message" -ForegroundColor Yellow
Write-Host ""

Write-Host "Adding changes..." -ForegroundColor Gray
git add -A

Write-Host "Committing..." -ForegroundColor Gray
git commit -m $Message

Write-Host "Pulling latest..." -ForegroundColor Gray
git pull origin master

Write-Host "Pushing..." -ForegroundColor Gray
git push origin master

Write-Host ""
Write-Host "Done! Pushed to GitHub successfully" -ForegroundColor Green
