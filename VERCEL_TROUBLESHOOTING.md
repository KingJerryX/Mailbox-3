# 🔧 Vercel Deployment Troubleshooting Guide

## Common Issues and Solutions

### Issue: Register/Login Returning Errors

#### 1. Check JWT_SECRET Environment Variable

**Problem:** Authentication fails if `JWT_SECRET` is not set.

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `JWT_SECRET` exists
3. Make sure it's enabled for **all environments** (Production, Preview, Development)
4. **Redeploy** after adding/changing environment variables:
   - Go to Deployments tab
   - Click "..." on latest deployment → Redeploy

#### 2. Check Vercel Function Logs

**How to view logs:**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Click on a function (e.g., `/api/auth/register`)
4. View the "Function Logs" tab

**What to look for:**
- Database errors
- JWT_SECRET missing errors
- File system permission errors
- Import/module errors

#### 3. Database Persistence Issue

**Problem:** Vercel uses serverless functions with a read-only filesystem. The JSON database file won't persist between deployments.

**Current Fix:** The code now uses `/tmp` directory which is writable, but data is still ephemeral (lost between function invocations).

**Temporary Workaround:**
- Data will work during a single session
- After redeployment, data resets
- This is expected behavior with file-based database on serverless

**Permanent Solution:** Use a proper database:
- **Vercel Postgres** (recommended, integrates well)
- **Supabase** (free tier available)
- **MongoDB Atlas** (free tier available)
- **PlanetScale** (MySQL, free tier)

#### 4. Check Build Logs

**How to view:**
1. Vercel Dashboard → Your Project → Deployments
2. Click on deployment → View build logs

**Common build errors:**
- Missing dependencies
- ES module import errors
- Type errors

### Issue: "Module not found" or Import Errors

**Solution:**
1. Make sure all dependencies are in `package.json`
2. Run `npm install` locally to verify
3. Check that imports use `.js` extension (for ES modules)
4. Redeploy on Vercel

### Issue: CORS Errors

**If you see CORS errors in browser console:**
- The API routes already have CORS headers
- Check that you're using the correct Vercel URL
- Make sure frontend and backend are on the same domain (or configure CORS properly)

### Issue: 500 Internal Server Error

**Steps to debug:**
1. Check Vercel function logs (see above)
2. Check browser console for error messages
3. Verify environment variables are set
4. Check that database can be written to

## Quick Diagnostic Checklist

- [ ] `JWT_SECRET` environment variable is set in Vercel
- [ ] Environment variable is enabled for all environments
- [ ] Redeployed after adding environment variables
- [ ] Checked Vercel function logs for errors
- [ ] Verified build completed successfully
- [ ] All dependencies are in `package.json`
- [ ] Using correct Vercel deployment URL

## Getting More Detailed Error Information

### Option 1: Check Vercel Logs
1. Vercel Dashboard → Your Project
2. Deployments → Latest deployment
3. Functions → Click on the failing function
4. View "Function Logs" tab

### Option 2: Add Console Logging
The code now includes better error logging. Check:
- Browser console (F12 → Console tab)
- Vercel function logs
- Network tab (F12 → Network) to see API responses

### Option 3: Test Locally First
```bash
# Set environment variable locally
# Windows PowerShell:
$env:JWT_SECRET="your-secret-key-here"
npm run dev

# Test registration/login locally first
# If it works locally but not on Vercel, it's likely an environment variable issue
```

## Common Error Messages and Fixes

### "JWT_SECRET is not defined"
**Fix:** Add `JWT_SECRET` environment variable in Vercel

### "EACCES: permission denied"
**Fix:** Database now uses `/tmp` directory (already fixed in code)

### "Cannot read property 'users' of undefined"
**Fix:** Database initialization issue - check function logs

### "Module not found: lowdb"
**Fix:** Make sure `lowdb` is in `package.json` dependencies

## Next Steps: Migrate to a Real Database

For production, consider migrating to a proper database. Here are quick options:

### Option 1: Vercel Postgres (Easiest)
1. Vercel Dashboard → Storage → Create Database → Postgres
2. Get connection string
3. Update `lib/db.js` to use Postgres instead of lowdb

### Option 2: Supabase (Free Tier)
1. Sign up at supabase.com
2. Create project
3. Get connection string
4. Use Supabase client library

### Option 3: MongoDB Atlas (Free Tier)
1. Sign up at mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Use MongoDB driver

## Still Having Issues?

1. **Share the error message** from:
   - Browser console
   - Vercel function logs
   - Network tab response

2. **Check these specific things:**
   - What exact error message do you see?
   - Does it work locally?
   - When did it stop working?
   - Did you recently change anything?

3. **Common fixes:**
   - Clear browser cache
   - Hard refresh (Ctrl+Shift+R)
   - Redeploy on Vercel
   - Check environment variables again
