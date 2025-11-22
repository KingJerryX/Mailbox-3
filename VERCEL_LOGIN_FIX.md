# 🔧 Fixing Login Errors on Vercel

## The Main Problem

**Vercel uses serverless functions** - each API request runs in a separate, stateless environment. This means:

1. ❌ **Database file doesn't persist** - Even with `/tmp`, data is lost between function invocations
2. ❌ **Users created in one request won't exist in the next** - Each function starts fresh
3. ❌ **File-based database won't work** for production on serverless

## Quick Diagnosis

### Step 1: Check What Error You're Seeing

**Option A: Check Browser Console**
1. Open your Vercel site
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Try to login
5. Look for error messages

**Option B: Check Vercel Function Logs**
1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** → Latest deployment
3. Click on `/api/auth/login` function
4. View **Function Logs** tab
5. Try logging in again and watch the logs

### Step 2: Test Database Endpoint

I've added a debug endpoint. Visit:
```
https://your-site.vercel.app/api/debug/db
```

This will show:
- If database is working
- How many users exist
- If JWT_SECRET is set
- If you're on Vercel

## Common Errors and Fixes

### Error 1: "JWT_SECRET_MISSING"
**Problem:** Environment variable not set

**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Add `JWT_SECRET` with a strong random string
3. Enable for **all environments** (Production, Preview, Development)
4. **Redeploy** after adding

### Error 2: "Invalid username or password" (but you just registered)
**Problem:** Database not persisting - user was created but lost

**This is the main issue!** The file-based database won't work on Vercel serverless.

### Error 3: Database write errors
**Problem:** Can't write to filesystem on Vercel

**Fix:** Already handled in code, but data still won't persist

## The Real Solution: Use a Database

The file-based database (`lowdb` with JSON file) **cannot work** on Vercel's serverless platform. You need a real database.

### Option 1: Vercel Postgres (Recommended - Easiest)

1. **Create Database:**
   - Vercel Dashboard → Your Project
   - Click **Storage** tab
   - Click **Create Database** → **Postgres**
   - Choose a name and region
   - Click **Create**

2. **Get Connection String:**
   - After creation, click on the database
   - Copy the **Connection String** (starts with `postgres://`)

3. **Install Dependencies:**
   ```bash
   npm install @vercel/postgres
   ```

4. **Update Code:**
   I can help you migrate the database code to use Postgres instead of lowdb.

### Option 2: Supabase (Free Tier Available)

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Get connection string from Settings → Database
4. Install: `npm install @supabase/supabase-js`
5. Update code to use Supabase

### Option 3: MongoDB Atlas (Free Tier)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Install: `npm install mongodb`
5. Update code to use MongoDB

## Temporary Workaround (For Testing Only)

If you want to test the app quickly without setting up a database:

The current code will work **within a single session** but data resets between deployments. This is **not suitable for production**.

## Next Steps

1. **Tell me what error you're seeing** - Check browser console or Vercel logs
2. **Choose a database** - I recommend Vercel Postgres (easiest integration)
3. **I'll help migrate the code** - Once you choose, I can update all the database code

## Quick Test

Visit this URL to see database status:
```
https://your-site.vercel.app/api/debug/db
```

This will show:
- ✅ If database is accessible
- ✅ How many users exist
- ✅ If JWT_SECRET is configured
- ✅ Current database path

---

**The bottom line:** You need a real database for Vercel. The file-based approach won't work in production. Let me know which database you'd like to use, and I'll help you migrate the code!
