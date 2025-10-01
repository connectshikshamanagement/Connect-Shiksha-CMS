# 🚀 Deploy Connect Shiksha CRM - 100% FREE (Beginner's Guide)

**No credit card required! Everything free!**

---

## 🎯 **What You'll Deploy**

- ✅ **Frontend** (Next.js) on **Vercel** - FREE
- ✅ **Backend** (Node.js) on **Render** - FREE
- ✅ **Database** (MongoDB) on **MongoDB Atlas** - FREE

**Total Cost:** ₹0 (FREE) 🎉

---

## 📋 **Prerequisites**

Before starting, you need:
- [ ] GitHub account (free at https://github.com)
- [ ] Email address
- [ ] Your code ready (already done ✅)

**That's it! No credit card, no payment!**

---

## 🗺️ **Deployment Roadmap**

```
Step 1: Push code to GitHub (10 minutes)
   ↓
Step 2: Setup MongoDB Atlas (5 minutes)
   ↓
Step 3: Deploy Backend on Render (10 minutes)
   ↓
Step 4: Deploy Frontend on Vercel (5 minutes)
   ↓
Step 5: Test everything (5 minutes)

TOTAL TIME: 35 minutes
```

---

# 🔥 **STEP 1: PUSH CODE TO GITHUB**

## **1.1 Create GitHub Repository**

**Go to:** https://github.com/new

**Fill in:**
- Repository name: `connect-shiksha-crm`
- Description: `Company Management System for Connect Shiksha`
- Visibility: **Public** (required for free deployment) ✅
- **DO NOT** check any boxes (README, .gitignore, license)

**Click:** "Create repository" (green button)

**Copy the URL shown:** 
```
https://github.com/YOUR_USERNAME/connect-shiksha-crm.git
```

## **1.2 Push Your Code**

**Open PowerShell in your project folder and run:**

```powershell
cd "C:\Users\kulde\Desktop\Full Stack CRM"

# Add GitHub as remote (REPLACE YOUR_USERNAME!)
git remote add origin https://github.com/YOUR_USERNAME/connect-shiksha-crm.git

# Push code
git push -u origin master
```

**Example:** If your username is "kuldepsingh":
```powershell
git remote add origin https://github.com/kuldepsingh/connect-shiksha-crm.git
git push -u origin master
```

**When Asked for Credentials:**
- Username: Your GitHub username
- Password: Create a Personal Access Token:
  1. Go to: https://github.com/settings/tokens
  2. Click "Generate new token" → "Generate new token (classic)"
  3. Name: `connect-shiksha-deployment`
  4. Check: `repo` (full control of private repositories)
  5. Click "Generate token"
  6. **COPY THE TOKEN** (you won't see it again!)
  7. Use this token as password

**Verify:** Go to `https://github.com/YOUR_USERNAME/connect-shiksha-crm` - you should see all files!

---

# 💾 **STEP 2: SETUP MONGODB ATLAS (FREE DATABASE)**

## **2.1 Create MongoDB Atlas Account**

**Go to:** https://www.mongodb.com/cloud/atlas/register

**Sign up with:**
- Email address
- Password
- OR use "Sign up with Google"

## **2.2 Create Free Cluster**

1. After login, click **"Build a Database"**

2. Choose: **M0 FREE** (Shared, 512MB storage)
   - ✅ This is completely FREE forever!

3. Provider: **AWS** (or any)

4. Region: Choose closest to India (e.g., **Mumbai (ap-south-1)**)

5. Cluster Name: `connect-shiksha-cluster`

6. Click **"Create Deployment"** (green button)

## **2.3 Setup Database User**

You'll see a popup "Security Quickstart":

1. **Create Database User:**
   - Username: `admin`
   - Password: Click "Autogenerate Secure Password" → **COPY IT!**
   - Save password somewhere safe: `________`

2. Click **"Create Database User"**

## **2.4 Add Network Access**

1. **Add IP Address:**
   - Click "Add My Current IP Address"
   - Also click "Add Entry" → Enter: `0.0.0.0/0` (allows from anywhere)
   - Description: `Allow from anywhere`
   - Click "Add Entry"

2. Click **"Finish and Close"**

## **2.5 Get Connection String**

1. Click **"Connect"** button on your cluster

2. Choose: **"Connect your application"**

3. Driver: **Node.js** version **5.5 or later**

4. **Copy the connection string:**
```
mongodb+srv://admin:<password>@connect-shiksha-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. **IMPORTANT:** Replace `<password>` with the password you copied earlier

**Final connection string should look like:**
```
mongodb+srv://admin:YourActualPassword123@connect-shiksha-cluster.xxxxx.mongodb.net/connect-shiksha-crm?retryWrites=true&w=majority
```

**Save this connection string! You'll need it!**

---

# ⚙️ **STEP 3: DEPLOY BACKEND ON RENDER (FREE)**

## **3.1 Create Render Account**

**Go to:** https://render.com/

**Click:** "Get Started for Free"

**Sign up with:** GitHub account (click "Sign in with GitHub" → Authorize Render)

## **3.2 Create New Web Service**

1. On Render dashboard, click **"New +"** → **"Web Service"**

2. Connect Repository:
   - Click "Configure account" if needed
   - Find: `connect-shiksha-crm`
   - Click **"Connect"**

## **3.3 Configure Backend Service**

**Fill in these EXACT values:**

**Name:** `connect-shiksha-backend`

**Region:** Singapore (or closest to you)

**Branch:** `master`

**Root Directory:** (leave empty)

**Runtime:** `Node`

**Build Command:**
```
npm install
```

**Start Command:**
```
node server.js
```

**Instance Type:** **Free** ✅

## **3.4 Add Environment Variables**

Click **"Advanced"** → Scroll to **"Environment Variables"**

**Add these one by one** (click "Add Environment Variable" for each):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | Paste your MongoDB Atlas connection string here |
| `JWT_SECRET` | `connect_shiksha_secret_production_2025_change_this` |
| `JWT_EXPIRE` | `7d` |
| `CLIENT_URL` | `https://YOUR-APP-NAME.vercel.app` (we'll update this later) |

**For MONGODB_URI:** Paste the full connection string from MongoDB Atlas (Step 2.5)

**Click:** "Create Web Service" (green button)

**Wait:** 5-10 minutes for deployment...

You'll see logs scrolling. Wait for:
```
✅ MongoDB Connected
🚀 Server running on port 10000
```

**Copy your backend URL:**
```
https://connect-shiksha-backend.onrender.com
```

**Save this URL!**

---

# 🌐 **STEP 4: DEPLOY FRONTEND ON VERCEL (FREE)**

## **4.1 Create Vercel Account**

**Go to:** https://vercel.com/signup

**Click:** "Continue with GitHub"

**Authorize** Vercel to access your GitHub

## **4.2 Import Project**

1. Click **"Add New..."** → **"Project"**

2. Find your repository: `connect-shiksha-crm`

3. Click **"Import"**

## **4.3 Configure Frontend**

**Project Name:** `connect-shiksha-crm` (auto-filled)

**Framework Preset:** Next.js (auto-detected) ✅

**Root Directory:** Click "Edit" → Enter: `client` ✅
(This is IMPORTANT! The frontend is in the `client` folder)

**Build Settings:**
- Build Command: `npm run build` (auto-filled)
- Output Directory: `.next` (auto-filled)
- Install Command: `npm install` (auto-filled)

**Environment Variables:**

Click "Add" and enter:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://connect-shiksha-backend.onrender.com/api` |

**Replace** `connect-shiksha-backend.onrender.com` with YOUR actual Render backend URL!

**Click:** "Deploy" (blue button)

**Wait:** 2-3 minutes for deployment...

You'll see: "Congratulations! Your project has been deployed."

**Your app URL:**
```
https://connect-shiksha-crm.vercel.app
```

**Copy this URL!**

---

# 🔄 **STEP 5: UPDATE BACKEND WITH FRONTEND URL**

## **5.1 Update Render Environment Variable**

1. Go back to Render dashboard: https://dashboard.render.com

2. Click on your **"connect-shiksha-backend"** service

3. Click **"Environment"** (left sidebar)

4. Find **`CLIENT_URL`** variable

5. Click "Edit" → Update to: `https://connect-shiksha-crm.vercel.app`

6. Click **"Save Changes"**

**Wait:** Service will automatically redeploy (2-3 minutes)

---

# 🌱 **STEP 6: SEED THE DATABASE**

## **6.1 Run Seed Command on Render**

1. In Render dashboard, go to your backend service

2. Click **"Shell"** tab (left sidebar)

3. Wait for shell to connect

4. Type this command:
```bash
npm run seed
```

5. Press Enter

6. **Wait for:**
```
✅ Created roles
✅ Created users
✅ Created teams
✅ Created projects
✅ Created products
✅ Created clients
✅ Created income records
✅ Created expense records
✅ Created profit sharing rules

🎉 Seed data created successfully!

📧 Login credentials:
   Email: founder@connectshiksha.com
   Password: founder123
```

**Done!** Your database is populated!

---

# 🧪 **STEP 7: TEST YOUR DEPLOYED SYSTEM**

## **7.1 Open Your App**

**Go to:** `https://connect-shiksha-crm.vercel.app`

(Use YOUR actual Vercel URL)

## **7.2 Login**

**Email:** `founder@connectshiksha.com`  
**Password:** `founder123`

**Click:** Login

**Expected:** You should see the Dashboard! 🎉

## **7.3 Test Features**

**Try these:**
1. ✅ Dashboard loads
2. ✅ Click Teams → See 3 teams
3. ✅ Click Projects → See 3 projects
4. ✅ Click Finance → See income/expenses
5. ✅ Click Products → See 3 products
6. ✅ Try creating a team
7. ✅ Try dragging a task in Tasks page

**If everything works:** 🎊 **SUCCESS! You're deployed!**

---

# 🎯 **YOUR LIVE URLS**

Once deployed, you'll have:

```
✅ Frontend:  https://connect-shiksha-crm.vercel.app
✅ Backend:   https://connect-shiksha-backend.onrender.com
✅ Database:  MongoDB Atlas (cloud)
```

**Share the frontend URL with your team!**

---

# 🆓 **FREE TIER LIMITS**

**Vercel (Frontend):**
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Auto SSL certificate
- ✅ Global CDN

**Render (Backend):**
- ✅ 750 hours/month (always running)
- ⚠️ Sleeps after 15 min inactivity (wakes up on request)
- ✅ Auto SSL certificate
- ⚠️ First request after sleep may be slow (30 seconds)

**MongoDB Atlas (Database):**
- ✅ 512 MB storage (enough for 1000s of records)
- ✅ Shared cluster
- ✅ Automatic backups

**Good For:** Small teams, testing, staging, low-traffic production

---

# ⚠️ **TROUBLESHOOTING**

## **Problem: Backend won't start**

**Solution:**
1. Check Render logs: Click "Logs" tab
2. Verify MongoDB connection string is correct
3. Make sure password in connection string has no special characters that need encoding

## **Problem: Frontend shows API errors**

**Solution:**
1. Check `NEXT_PUBLIC_API_URL` in Vercel
2. Should be: `https://YOUR-BACKEND.onrender.com/api` (with `/api` at end!)
3. Redeploy if changed: Vercel → Deployments → Redeploy

## **Problem: Database connection failed**

**Solution:**
1. MongoDB Atlas → Network Access → Make sure `0.0.0.0/0` is added
2. Database → Database Access → Make sure user is created
3. Check password is correct in connection string

## **Problem: Login not working**

**Solution:**
1. Make sure you ran `npm run seed` on Render Shell
2. Try the seed command again
3. Check backend logs for errors

## **Problem: Render service sleeps**

**Solution:**
- Free tier sleeps after 15 min inactivity
- First request after sleep takes ~30 seconds
- **Upgrade to paid ($7/month)** for always-on
- OR use a ping service to keep it awake

---

# 📱 **BONUS: Deploy Mobile App (Optional)**

## **For Android:**

1. Install Flutter: https://flutter.dev/docs/get-started/install

2. Update API URL in Flutter:
```dart
// flutter_app/lib/services/api_service.dart
static const String baseUrl = 'https://YOUR-BACKEND.onrender.com/api';
```

3. Build APK:
```bash
cd flutter_app
flutter build apk --release
```

4. Find APK: `flutter_app/build/app/outputs/flutter-apk/app-release.apk`

5. Share APK file with your team to install on Android phones!

---

# 🎊 **COMPLETE! YOUR SYSTEM IS LIVE!**

**After following all steps, you'll have:**

✅ **Live Website:** https://your-app.vercel.app  
✅ **Live API:** https://your-backend.onrender.com  
✅ **Cloud Database:** MongoDB Atlas  
✅ **100% FREE!**  
✅ **Auto SSL (HTTPS)**  
✅ **Global CDN**  
✅ **Automatic deployments on git push**  

---

# 🔄 **UPDATING YOUR DEPLOYED APP**

**When you make changes:**

```bash
# 1. Make your changes to code

# 2. Commit to git
git add .
git commit -m "Your change description"

# 3. Push to GitHub
git push

# 4. Automatic deployment!
# Vercel: Auto-deploys immediately
# Render: Auto-deploys in 2-3 minutes
```

**No manual deployment needed!** Just push to GitHub! 🚀

---

# 💡 **PRO TIPS**

**Tip 1:** Bookmark your URLs for easy access

**Tip 2:** Add your backend URL to Render custom domain (optional)

**Tip 3:** Set up MongoDB Atlas backups (free tier has daily backups)

**Tip 4:** Monitor Render logs for errors

**Tip 5:** Use Vercel analytics (free) to track usage

**Tip 6:** Add your team members to GitHub repo as collaborators

---

# 📞 **NEED HELP?**

**Vercel Issues:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

**Render Issues:**
- Docs: https://render.com/docs
- Support: https://render.com/contact

**MongoDB Atlas:**
- Docs: https://docs.atlas.mongodb.com
- Support: https://www.mongodb.com/support

**This Project:**
- Check: QUICKSTART.md
- Check: DEPLOYMENT.md
- Email: founder@connectshiksha.com

---

# ✅ **SUCCESS CHECKLIST**

After deployment, verify:

- [ ] Frontend URL opens
- [ ] Shows login page
- [ ] Can login with founder credentials
- [ ] Dashboard displays
- [ ] Can navigate all pages
- [ ] Can create a team
- [ ] Can create a project
- [ ] Backend API responds (check /health)
- [ ] Database has seed data

**If all checked:** 🎉 **YOU'RE DEPLOYED!**

---

**Next page has the DETAILED STEP-BY-STEP with screenshots...**

