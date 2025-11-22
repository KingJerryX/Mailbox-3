# 🚀 Deployment Guide: GitHub + Vercel

This guide will help you push your code to GitHub and deploy it to Vercel.

## Step 1: Install Git (if not already installed)

1. Download Git from: https://git-scm.com/download/win
2. Install it with default settings
3. Restart your terminal/command prompt after installation

## Step 2: Initialize Git Repository

Open your terminal in the project folder and run:

```bash
# Initialize git repository
git init

# Add all files to staging
git add .

# Create your first commit
git commit -m "Initial commit: Mailbox project"
```

## Step 3: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in (or create an account)
2. Click the **"+"** icon in the top right → **"New repository"**
3. Name your repository (e.g., `mailbox-project` or `our-mailbox`)
4. **DO NOT** initialize with README, .gitignore, or license (you already have these)
5. Click **"Create repository"**

## Step 4: Push Code to GitHub

After creating the repository, GitHub will show you commands. Use these (replace `YOUR_USERNAME` and `YOUR_REPO_NAME`):

```bash
# Add GitHub as remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** You may be prompted for your GitHub username and password. Use a **Personal Access Token** as password (GitHub no longer accepts regular passwords):
- Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate new token with `repo` permissions
- Use that token as your password

## Step 5: Deploy to Vercel

### Option A: Using Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign in (or sign up with your GitHub account)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset:** Next.js (should be auto-detected)
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `.next` (auto-filled)
5. **Add Environment Variable:**
   - Click "Environment Variables"
   - Add `JWT_SECRET` with a strong random string (use a password generator)
   - This is important for authentication to work!
6. Click **"Deploy"**
7. Wait for deployment to complete (usually 1-2 minutes)
8. Your site will be live at: `https://your-project-name.vercel.app`

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from your project directory)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (choose your account)
# - Link to existing project? No (for first time)
# - Project name? (enter a name)
# - Directory? ./ (default)
# - Override settings? No (default)
```

## Step 6: Configure Environment Variables in Vercel

**Important:** After deployment, add environment variables:

1. Go to your project dashboard on Vercel
2. Click **Settings** → **Environment Variables**
3. Add:
   - **Name:** `JWT_SECRET`
   - **Value:** A strong random string (generate one using a password generator)
   - **Environment:** Production, Preview, Development (check all)
4. Click **Save**
5. Go to **Deployments** tab
6. Click the **"..."** menu on the latest deployment → **Redeploy**

## Step 7: Update Your Code

When you make changes to your code:

```bash
# Stage your changes
git add .

# Commit changes
git commit -m "Description of your changes"

# Push to GitHub
git push

# Vercel will automatically redeploy your site!
```

## 🎉 You're Done!

Your mailbox app is now live on Vercel! Share the URL with your partner.

## 🔒 Security Reminder

- Never commit `.env.local` or `.env` files (already in .gitignore)
- Use a strong `JWT_SECRET` in production
- Consider upgrading to a real database for production (Vercel Postgres, Supabase, etc.)

## 📝 Notes

- Vercel automatically detects Next.js projects
- Each push to the `main` branch triggers a new deployment
- You get a free SSL certificate automatically
- Vercel provides preview deployments for pull requests

## 🆘 Troubleshooting

**Build fails on Vercel?**
- Check the build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Ensure `JWT_SECRET` environment variable is set

**Authentication not working?**
- Verify `JWT_SECRET` is set in Vercel environment variables
- Make sure it's the same value across all environments

**Database not persisting?**
- The JSON file database (`database/db.json`) won't persist on Vercel (serverless)
- Consider migrating to a database service like Vercel Postgres or Supabase for production
