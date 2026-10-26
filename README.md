# 📸 Shnik — Real-World Social Media & Direct Messaging

A modern, full-stack social media web app built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (Auth, Postgres, Realtime, Storage)**, ready for 1-click deployment on **Vercel**.

Designed with the exact visual aesthetics, layouts, and typography of Instagram as it is today: light theme, clean borders, stories tray, posts feed with likes & comments, explore photo grid, profile with post counts and highlights, and direct messaging with end-to-end verified delivery.

---

## 🚀 Free Real-World Hosting & Setup (100% Free, No Credit Card Required)

To run Shnik live for real users online, you only need two completely free services:
1. **Supabase (Free Tier)**: For real user authentication, database, realtime messaging, and photo storage.
2. **Vercel (Free Tier)**: For hosting the Next.js web application with free SSL and worldwide CDN.

---

### Step 1: Set up Free Supabase Backend (Takes ~3 minutes)

1. Sign up for free at **[supabase.com](https://supabase.com)** (sign in with GitHub).
2. Click **New Project**:
   - Name: `Shnik`
   - Database Password: Choose any strong password (save it).
   - Region: Select closest to you (e.g., US, Europe, India).
   - Click **Create new project**.
3. Go to **SQL Editor** in the left menu.
4. Click **New Query**, paste the contents of `supabase/migrations/001_initial_schema.sql`, and click **Run**.
   - *This automatically creates all tables (`profiles`, `follows`, `messages`, `posts`, `post_likes`, `post_comments`), triggers, RLS security policies, storage buckets (`avatars`, `posts`), and enables Realtime!*
5. Go to **Project Settings** (gear icon) -> **API**:
   - Copy **Project URL** (`https://xyz.supabase.co`)
   - Copy **anon public key**
   - Copy **service_role secret key**

---

### Step 2: Deploy to Vercel (Takes ~2 minutes)

1. Sign in to **[vercel.com](https://vercel.com)** with your GitHub account.
2. Click **Add New** -> **Project**.
3. Import the repository: `tShivam25/Shnik`.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Your Supabase Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Your Supabase Anon Key)
   - `SUPABASE_SERVICE_ROLE_KEY` = (Your Supabase Service Role Key)
   - `NEXT_PUBLIC_MOCK` = `false`
5. Click **Deploy**!
   - Vercel will build and assign you a live HTTPS URL (e.g. `https://shnik.vercel.app`).
   - Your friends and real users can now sign up, create accounts, follow each other, post photos, and exchange direct messages in real time!

---

### Step 3: Local Development (Optional)

To test locally with live Supabase or in mock mode:
```bash
# 1. Install dependencies
npm install

# 2. Setup your local environment
cp .env.example .env.local

# 3. Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🎨 Features & Architecture

- **Real Account Creation**: Users sign up with their own username, email, full name, and password.
- **Photos & Feed**: Create and share posts with photos and captions; interactive like button with count increment and comments.
- **Follow System**: Follow/unfollow users with mutual following counts.
- **Direct Messaging**:
  - Encrypted, verified message delivery.
  - Users can only message accounts they follow.
  - Live typing and delivery indicators (*"Delivered"*, *"Verified ✓"*).
- **Explore & Search**: Instant search for registered accounts + photo explore grid.
- **User Profiles**: Profile photo upload, post counts, followers/following, story highlights, and 3-column photo grid.
