# Quick Push Script
# Usage: .\push-now.ps1

$status = git status --porcelain

if ($status -eq $null) {
    Write-Host "No changes to commit"
    exit 0
}

Write-Host "Pushing changes..." -ForegroundColor Green

git add -A

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$hostname = $env:COMPUTERNAME
$commitMessage = "Update: $timestamp on $hostname"

git commit -m $commitMessage
git pull origin master
git push origin master

Write-Host "Done!" -ForegroundColor Green

