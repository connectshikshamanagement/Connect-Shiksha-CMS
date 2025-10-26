# Fast Push - Adds, commits, pulls, and pushes in one go
# Usage: .\push-fast.ps1 "Your commit message"

param(
    [string]$Message = "Update: Automated fast push"
)

Write-Host "🔥 Fast Push Mode" -ForegroundColor Cyan
Write-Host ""

# Quick check for changes
$changes = git status --porcelain
if ([string]::IsNullOrEmpty($changes)) {
    Write-Host "ℹ️  No changes detected" -ForegroundColor Yellow
    exit 0
}

# One-liner: add, commit, pull, push
Write-Host "📤 Pushing changes..." -ForegroundColor Yellow
git add -A && git commit -m $Message && git pull origin master && git push origin master

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Success!" -ForegroundColor Green
}

