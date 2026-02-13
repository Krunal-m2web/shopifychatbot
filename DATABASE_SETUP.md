# Database Setup Guide

## ⚠️ Current Issue

Your existing Neon database endpoint is not accessible. You need to create a new database.

## 🆕 Create a New Neon Database (5 minutes)

### Step 1: Sign Up/Login to Neon

Go to: https://console.neon.tech/signup

- Sign up with GitHub (recommended) or email
- Free tier gives you unlimited databases!

### Step 2: Create a New Project

1. Click **"New Project"** button
2. Fill in:
   - **Name**: `shopify-chatbot`
   - **Region**: Choose closest to you (e.g., US East, EU West)
   - **Postgres version**: 16 (default is fine)
3. Click **"Create Project"**

### Step 3: Get Connection String

After project creation, you'll see the connection string:

```
postgresql://neondb_owner:xxxxx@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
```

Click the **"Copy"** button next to the connection string.

### Step 4: Update Your `.env` File

Open `d:\Projects\Shopify\shopifychatbot\chat-bot\.env`

Replace these lines with your new connection string:

```bash
DATABASE_URL="postgresql://neondb_owner:YOUR_NEW_PASSWORD@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require"
NEON_DATABASE_URL="postgresql://neondb_owner:YOUR_NEW_PASSWORD@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require"
```

**Important**: Both should have the same value!

### Step 5: Test Connection

```bash
npm run db:test
```

You should see:
```
✅ Database connection successful!
```

### Step 6: Set Up Database Schema

```bash
# Create all tables
npm run db:push

# Set up pgvector extension and search functions
npm run db:vector-setup

# Test again to verify everything
npm run db:test
```

You should now see:
```
✅ Database connection successful!
✅ pgvector extension is installed
✅ merchants table exists
```

## ✅ You're Ready!

Your database is now set up and ready to use. You can start the development server:

```bash
npm run dev
```

## 🔧 Troubleshooting

### "Can't reach database server"

- Check your internet connection
- Verify the connection string is correct (no extra spaces)
- Make sure `sslmode=require` is included in the URL

### "Extension 'vector' not found"

Run the vector setup script:
```bash
npm run db:vector-setup
```

### "Table 'merchants' does not exist"

Run Prisma push:
```bash
npm run db:push
```

### Still having issues?

1. Delete the old `.env` file
2. Copy `.env.example` to `.env`
3. Fill in your new Neon connection string
4. Run `npm run db:test` again

## 📝 Need Help?

Check the Neon docs: https://neon.tech/docs/connect/connect-from-any-app
