# Auto Push Script for Connect Shiksha CMS
# Usage: .\push-changes.ps1 "Your commit message"

param(
    [Parameter(Mandatory=$false)]
    [string]$Message = "Update: Automated commit from push script"
)

Write-Host "🚀 Starting automated push..." -ForegroundColor Green
Write-Host ""

# Check if there are any changes
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "ℹ️  No changes to commit" -ForegroundColor Yellow
    exit 0
}

Write-Host "📝 Staging changes..." -ForegroundColor Yellow
git add -A

Write-Host "💾 Committing with message: $Message" -ForegroundColor Yellow
git commit -m $Message

Write-Host "🔄 Pulling latest changes from remote..." -ForegroundColor Yellow
git pull origin master

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Pull had conflicts, please resolve manually" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Pushing to remote..." -ForegroundColor Yellow
git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository: https://github.com/connectshikshamanagement/Connect-Shiksha-CMS" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Failed to push. Please check the error above." -ForegroundColor Red
    exit 1
}

