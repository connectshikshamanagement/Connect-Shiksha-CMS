# 🚀 How to Push Code to GitHub

## Manual Push (No Auto-Execution)

The `push.ps1` script **ONLY runs when you manually execute it**. It never runs automatically.

### Simple Usage

```powershell
# Just push with auto-generated message
.\push.ps1
```

### With Custom Message

```powershell
.\push.ps1 "Fixed team member selection with checkboxes"
```

## Important Notes

✅ **Manual Only** - Script only runs when YOU run it  
✅ **No Auto-Push** - Never pushes automatically  
✅ **Safe** - Shows you what it's doing  
✅ **Optional** - You can still use normal git commands  

## What It Does

1. Checks if there are changes
2. Shows you what it's doing
3. Stages all files
4. Commits with your message
5. Pulls latest changes
6. Pushes to GitHub

## Alternative: Use Git Directly

If you don't want to use the script, you can use git commands directly:

```powershell
git add -A
git commit -m "Your message"
git pull origin master
git push origin master
```

---

**The script will NOT run automatically. It only runs when you manually execute the command.**

