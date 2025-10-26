# Git Workflow - Manual Control

## ✅ No Automatic Push

**IMPORTANT:** Code will NEVER be pushed automatically to GitHub.

## How to Push Code (When You Want)

### Step 1: Check Changes
```powershell
git status
```

### Step 2: Stage Changes
```powershell
git add -A
```

### Step 3: Commit Changes
```powershell
git commit -m "Your commit message"
```

### Step 4: Pull Latest
```powershell
git pull origin master
```

### Step 5: Push to GitHub
```powershell
git push origin master
```

## Important Notes

- ✅ Code is NOT pushed automatically
- ✅ You have full control
- ✅ Only pushes when you explicitly run `git push`
- ✅ No hooks or automation

