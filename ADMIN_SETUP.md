# Admin Setup Guide

This guide explains how to set up admin access for FerryMail.

## Method 1: Environment Variable (Recommended)

Set the `ADMIN_USERNAME` environment variable to automatically grant admin access to a user when they register.

### Steps:

1. **Set Environment Variable:**
   - In Vercel: Go to your project settings → Environment Variables
   - Add: `ADMIN_USERNAME` = `your-admin-username`
   - Or in `.env.local` (for local development): `ADMIN_USERNAME=your-admin-username`

2. **Register the Admin User:**
   - Register a new account with the username you set in `ADMIN_USERNAME`
   - The user will automatically be granted admin access

3. **Login:**
   - Login with the admin account
   - You'll see the "🔍 Admin" link in the navigation

## Method 2: Set Admin via API (For Existing Users)

If you already have a user account and want to make it admin:

1. **Set ADMIN_SECRET Environment Variable:**
   - In Vercel: Add `ADMIN_SECRET` = `your-secret-key`
   - Or in `.env.local`: `ADMIN_SECRET=your-secret-key`

2. **Call the API:**
   ```bash
   curl -X POST https://your-domain.com/api/admin/set-admin \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "username-to-make-admin",
       "adminSecret": "your-secret-key"
     }'
   ```

   Or if you're already an admin:
   ```bash
   curl -X POST https://your-domain.com/api/admin/set-admin \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "username-to-make-admin"
     }'
   ```

## Method 3: Direct Database Update

If you have direct database access:

```sql
UPDATE users
SET is_admin = TRUE
WHERE username = 'your-admin-username';
```

## Admin Features

Once logged in as admin, you can:
- View the "🔍 Admin" link in the navigation (only visible to admins)
- Access `/admin/users` to view all registered users
- See user IDs, usernames, password hashes, and creation dates

## Security Notes

- Passwords are hashed using bcrypt and cannot be viewed in plain text
- Admin access is required to view the admin page
- The admin link only appears in navigation for admin users
- Use strong passwords and keep your `ADMIN_SECRET` secure
