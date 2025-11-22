# 🔐 GitHub Setup Guide: Personal Access Token & Pushing Code

This guide will walk you through creating a GitHub Personal Access Token and pushing your code to GitHub.

## Part 1: Creating a Personal Access Token (PAT)

### Step 1: Sign in to GitHub
1. Go to [github.com](https://github.com)
2. Sign in to your account (or create one if you don't have it)

### Step 2: Navigate to Token Settings
1. Click your **profile picture** in the top-right corner
2. Click **Settings** (bottom of the dropdown menu)

### Step 3: Go to Developer Settings
1. Scroll down on the left sidebar
2. Click **Developer settings** (near the bottom)

### Step 4: Create Personal Access Token
1. Click **Personal access tokens** in the left sidebar
2. Click **Tokens (classic)** - use classic tokens for now
3. Click the **"Generate new token"** button
4. Select **"Generate new token (classic)"** from the dropdown

### Step 5: Configure Your Token
Fill in the form:

1. **Note (name):**
   - Give it a descriptive name like: `Mailbox Project - Windows`
   - This helps you remember what it's for

2. **Expiration:**
   - Choose how long you want it to last:
     - **30 days** (recommended to start)
     - **60 days**
     - **90 days**
     - **No expiration** (less secure but convenient)

3. **Select scopes (permissions):**
   - Check the boxes for what you need:
     - ✅ **`repo`** - Full control of private repositories (CHECK THIS!)
       - This includes all sub-permissions:
         - repo:status
         - repo_deployment
         - public_repo
         - repo:invite
         - security_events

### Step 6: Generate Token
1. Scroll down and click the green **"Generate token"** button
2. **⚠️ IMPORTANT: Copy the token immediately!**
   - It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You will **NOT** be able to see it again after you leave this page
   - If you lose it, you'll need to create a new one
   - Save it somewhere safe temporarily (notepad, password manager, etc.)

### Step 7: Store Token Securely
- Save it in a password manager, or
- Keep it in a secure text file temporarily until you use it
- **Never share it publicly or commit it to Git!**

---

## Part 2: Setting Up Git (First Time Only)

### Install Git (if not installed)

1. Download Git: https://git-scm.com/download/win
2. Run the installer
3. Use default settings (click "Next" through all prompts)
4. After installation, **restart your terminal/command prompt**

### Configure Git with Your Name and Email (First Time)

Open your terminal/PowerShell and run:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and GitHub email address.

---

## Part 3: Creating a GitHub Repository

### Step 1: Create New Repository on GitHub
1. Go to [github.com](https://github.com)
2. Click the **"+"** icon in the top-right corner
3. Click **"New repository"**

### Step 2: Repository Settings
Fill in the form:

1. **Repository name:**
   - Something like: `mailbox-project` or `our-mailbox`
   - Use lowercase letters, numbers, and hyphens (no spaces)

2. **Description:** (optional)
   - Example: "A sweet mailbox for long-distance couples"

3. **Visibility:**
   - Choose **Private** (recommended for personal projects)
   - Or **Public** (if you want others to see it)

4. **⚠️ IMPORTANT - DO NOT CHECK THESE:**
   - ❌ Do NOT check "Add a README file"
   - ❌ Do NOT check "Add .gitignore"
   - ❌ Do NOT check "Choose a license"
   - (You already have these files in your project)

5. Click the green **"Create repository"** button

### Step 3: Copy Repository URL
After creating, you'll see a page with setup instructions.
- Copy the **HTTPS URL** - it will look like:
  ```
  https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
  ```
- Keep this URL handy for the next steps

---

## Part 4: Pushing Your Code to GitHub

### Step 1: Open Terminal in Your Project Folder
1. Navigate to your project folder:
   ```bash
   cd "C:\Users\start\Mailbox Project"
   ```

   Or in File Explorer:
   - Go to your project folder
   - Right-click in the folder
   - Select **"Open in Terminal"** or **"Git Bash Here"** (if available)

### Step 2: Initialize Git Repository
Run these commands one by one:

```bash
# Initialize git repository
git init
```

### Step 3: Add All Files
```bash
# Add all files to staging
git add .
```

### Step 4: Create First Commit
```bash
# Create your first commit
git commit -m "Initial commit: Mailbox project"
```

### Step 5: Connect to GitHub
Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values:

```bash
# Add GitHub as remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

Example:
```bash
git remote add origin https://github.com/johnsmith/mailbox-project.git
```

### Step 6: Rename Branch to Main
```bash
# Rename branch to 'main' (GitHub's default)
git branch -M main
```

### Step 7: Push to GitHub (Use Your PAT Here!)

```bash
# Push to GitHub
git push -u origin main
```

**When prompted:**

1. **Username:** Enter your GitHub username (not email)
   ```
   Username for 'https://github.com': YOUR_USERNAME
   ```

2. **Password:** ⚠️ **Paste your Personal Access Token here** (not your GitHub password!)
   ```
   Password for 'https://YOUR_USERNAME@github.com': ghp_xxxxxxxxxxxxxxxxxxxx
   ```
   - The cursor won't move when you type (this is normal for security)
   - Paste the entire token (starts with `ghp_`)
   - Press Enter

3. **If successful**, you'll see:
   ```
   Enumerating objects: X, done.
   Counting objects: 100% (X/X), done.
   ...
   To https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    * [new branch]      main -> main
   Branch 'main' set up to track remote branch 'main' from 'origin'.
   ```

🎉 **Success!** Your code is now on GitHub!

---

## Part 5: Future Pushes (After First Time)

Once everything is set up, pushing updates is easy:

```bash
# Stage all changes
git add .

# Commit with a message describing your changes
git commit -m "Added new feature"

# Push to GitHub (no password needed if using credential helper)
git push
```

**Note:** Windows may save your credentials using Git Credential Manager. If prompted again:
- Use your **username** (not email)
- Use your **Personal Access Token** (not password)

---

## Troubleshooting

### "Authentication failed" or "bad credentials"

1. **Check your username** - Use your GitHub username, not email
2. **Verify your token** - Make sure you copied the entire token
3. **Check token expiration** - Token might have expired, create a new one
4. **Check token permissions** - Make sure `repo` scope is selected

### "Repository not found"

- Verify the repository URL is correct
- Make sure the repository exists on GitHub
- Check that you have access (if it's a private repo)

### "fatal: not a git repository"

- Make sure you're in the project folder
- Run `git init` first

### Git not recognized

- Git might not be installed
- Restart your terminal after installing Git
- Add Git to PATH (usually done automatically during installation)

### Want to use SSH instead of HTTPS?

If you prefer SSH (no token needed after setup):

1. Generate SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your.email@example.com"
   ```

2. Add SSH key to GitHub:
   - Copy `~/.ssh/id_ed25519.pub` contents
   - GitHub → Settings → SSH and GPG keys → New SSH key

3. Use SSH URL when adding remote:
   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

---

## Quick Reference

**First time setup:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**When pushing updates:**
```bash
git add .
git commit -m "Your commit message"
git push
```

**Credentials:**
- Username: Your GitHub username
- Password: Your Personal Access Token (starts with `ghp_`)

---

## Security Tips

✅ **DO:**
- Use tokens with minimal required permissions
- Set token expiration dates
- Store tokens securely (password manager)
- Use different tokens for different projects

❌ **DON'T:**
- Share tokens publicly
- Commit tokens to Git (they're already in .gitignore)
- Use your GitHub password (PAT is required now)
- Create tokens with unnecessary permissions

---

**You're all set!** Your code is now on GitHub and ready to deploy to Vercel! 🚀
