# 🚢 FerryMail - A Sweet Long-Distance Gift

A beautiful mailbox website for long-distance couples to leave sweet messages for each other. Upload cute designs, send messages, and get notified when your special someone leaves you something!

## ✨ Features

- 💕 **Private Messaging**: Leave sweet messages for each other
- 🎨 **Custom Designs**: Upload cute mailbox backgrounds/images
- 🔔 **Real-time Notifications**: Get notified when new messages arrive
- 💌 **Beautiful UI**: Gradient backgrounds, animations, and smooth transitions
- 📊 **Unread Counter**: See how many unread messages you have
- 📝 **Message History**: View all your received messages

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Navigate to the project folder:**
   ```bash
   cd "Mailbox Project"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   Create a file named `.env.local` in the root directory with:
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

   Or use a random string generator to create a secure secret key.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Go to [http://localhost:3000](http://localhost:3000)

## 📖 How to Use

### Step 1: Create Accounts
1. Go to `http://localhost:3000/register`
2. Create **two accounts** (one for you, one for your girlfriend):
   - Enter a username
   - Enter a password (minimum 6 characters)
   - Click "Create Account"

### Step 2: Login
1. Go to `http://localhost:3000/login`
2. Login with one of the accounts

### Step 3: Access Your Mailbox
- Click "🚢 Mailbox" in the navigation bar
- Or go directly to `http://localhost:3000/mailbox`

### Step 4: Start Using!

#### 🎨 Upload a Cute Design
1. Click "🎨 Upload Mailbox Design"
2. Choose an image file from your computer
3. The image becomes your mailbox background!

#### ✉️ Send a Message
1. Click "✉️ Write a Message"
2. Select the recipient from the dropdown
3. Type your sweet message
4. Click "Send 🚢"

#### 📬 View Messages
- All received messages appear in your mailbox
- Unread messages have a "NEW" badge and glow effect
- Click on unread messages to mark them as read

#### 🔔 Real-time Notifications
- The app checks for new messages every 10 seconds
- When a new message arrives, you'll see a cute pop-up notification!
- The unread counter at the top shows how many new messages you have

## 🌐 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variable: `JWT_SECRET` (use a strong random string)
4. Deploy!

### Netlify
1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and add new site from Git
3. Add environment variable: `JWT_SECRET`
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Deploy!

**Note:** For production, consider using a proper database (like Vercel Postgres, Supabase, or MongoDB) instead of the JSON file for better performance and reliability.

## 🛠️ Tech Stack

- **Next.js 14** - React framework
- **lowdb** - JSON file database (easy to replace with a real database)
- **bcryptjs** - Password hashing
- **jsonwebtoken** - Authentication
- **CSS Modules** - Styled components

## 📁 Project Structure

```
Mailbox Project/
├── pages/
│   ├── api/
│   │   ├── auth/        # Authentication endpoints
│   │   └── mailbox/     # Mailbox API endpoints
│   ├── _app.js          # App wrapper
│   ├── index.js         # Home page
│   ├── login.js         # Login page
│   ├── register.js      # Registration page
│   └── mailbox.js       # Main mailbox page
├── components/
│   └── Layout.js        # Navigation layout
├── lib/
│   ├── auth.js          # Auth utilities
│   ├── db.js            # Database setup
│   └── mailbox.js       # Mailbox functions
├── styles/
│   ├── globals.css      # Global styles
│   ├── auth.module.css  # Auth page styles
│   └── mailbox.module.css # Mailbox page styles
└── database/
    └── db.json          # JSON database file (auto-created)
```

## 🔒 Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 30 days
- All API routes require authentication
- Consider using environment variables for secrets in production

## 🎁 Perfect for Long-Distance Couples!

This project is designed to be a sweet, personal gift. Customize it with:
- Your favorite colors (edit the CSS)
- Your own images and designs
- Personal touches in the messages
- Custom notification sounds (future enhancement)

Enjoy FerryMail! 🚢✨
