# 🚀 How to Push Updated Code to Vercel

Since Vercel is connected to your GitHub repository, pushing to GitHub automatically triggers a redeploy on Vercel!

## Quick Steps:

### 1. Open Terminal in Your Project
- In VS Code/Cursor: Press `` Ctrl + ` `` (backtick) to open terminal
- Or: Right-click your project folder → "Open in Terminal"
- Or: Navigate manually:
  ```bash
  cd "C:\Users\start\Mailbox Project"
  ```

### 2. Check What Changed
```bash
git status
```
This shows which files were modified.

### 3. Add All Changes
```bash
git add .
```
This stages all your changes for commit.

### 4. Commit the Changes
```bash
git commit -m "Fix database for Vercel serverless and improve error handling"
```
Use any descriptive message about what you changed.

### 5. Push to GitHub
```bash
git push
```
If this is your first push, you might need:
```bash
git push -u origin main
```

### 6. Vercel Auto-Deploys! 🎉
- Vercel automatically detects the push to GitHub
- It starts building within seconds
- Check your Vercel dashboard to see the deployment progress
- Usually takes 1-2 minutes to complete

---

## If You Haven't Set Up Git Yet:

### Step 1: Initialize Git
```bash
git init
```

### Step 2: Check if Remote Exists
```bash
git remote -v
```

If you see your GitHub URL, skip to step 5.

### Step 3: If No Remote, Add GitHub Remote
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```
Replace with your actual GitHub repo URL.

### Step 4: Check Branch Name
```bash
git branch
```
If you see `master`, rename it:
```bash
git branch -M main
```

### Step 5: Add, Commit, Push
```bash
git add .
git commit -m "Fix database for Vercel serverless"
git push -u origin main
```

---

## Verify Deployment on Vercel:

1. Go to [vercel.com](https://vercel.com)
2. Click on your project
3. Go to **Deployments** tab
4. You should see a new deployment starting/processing
5. Wait for it to complete (green checkmark)
6. Click on the deployment to see details
7. Your site URL will be updated automatically

---

## Quick Command Reference:

```bash
# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "Your commit message"

# Push to GitHub (triggers Vercel redeploy)
git push

# If first time, use:
git push -u origin main
```

---

## Troubleshooting:

### "fatal: not a git repository"
**Fix:** Run `git init` first

### "fatal: no upstream branch"
**Fix:** Use `git push -u origin main` instead of `git push`

### "Authentication failed"
**Fix:**
- Use your GitHub **username** (not email)
- Use your **Personal Access Token** as password (not your GitHub password)
- If prompted, generate a new token: GitHub → Settings → Developer settings → Personal access tokens

### "Permission denied"
**Fix:** Make sure you have push access to the repository

---

## What Changed That Needs Pushing:

The following files were updated:
- ✅ `lib/db.js` - Fixed for Vercel serverless
- ✅ `lib/mailbox.js` - Added error handling
- ✅ `pages/api/auth/register.js` - Better error messages
- ✅ `pages/api/auth/login.js` - Better error messages

---

**That's it!** Once you push to GitHub, Vercel will automatically redeploy your site with the fixes. 🎉
