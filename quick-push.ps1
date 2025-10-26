# Quick Push Script - Only pushes if changes exist
# Usage: .\quick-push.ps1

$status = git status --porcelain

if ([string]::IsNullOrEmpty($status)) {
    Write-Host "ℹ️  No changes to commit" -ForegroundColor Yellow
    exit 0
}

Write-Host "📝 Changes detected. Pushing..." -ForegroundColor Green

git add -A

# Auto-generate commit message with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$hostname = $env:COMPUTERNAME
$commitMessage = "Update: $timestamp on $hostname"

git commit -m $commitMessage
git pull origin master
git push origin master

Write-Host "✅ Done!" -ForegroundColor Green

