# 📸 Shnik — Real-World Social Media & Direct Messaging

[![Live Website](https://img.shields.io/badge/Live%20Demo-shnik--lake.vercel.app-0095F6?style=for-the-badge&logo=vercel&logoColor=white)](https://shnik-lake.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20Postgres%20%7C%20Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

**Live Website**: **[https://shnik-lake.vercel.app/](https://shnik-lake.vercel.app/)**

A modern, full-stack social media application designed with the exact visual aesthetics, layouts, and typography of modern Instagram: light theme, clean borders (`#DBDBDB`), stories tray, photo feed with likes & comments, account search, profile 3-column photo grid, and real-time direct messaging with quantum-secure hardware bridge integration.

Everything in Shnik is **100% user-based**: zero pre-seeded fake users, zero placeholder highlights, and zero pre-made dummy posts. Real accounts sign up, upload their photos, and interact.

---

## ✨ Features

- **⚡ Instant Username-Only Sign Up**:
  - No email verification hurdles or confirmation links.
  - Sign up with just **Full Name**, **Unique Username**, and **Password**.
  - Log in directly with **Username** and **Password**.
- **📸 Photo Sharing & Feed**:
  - Publish photo posts with custom captions (`/create`).
  - Home feed with interactive likes and comments.
  - Clean empty states when starting out.
- **👥 Follow System**:
  - Search for real users across the platform (`/search`).
  - Follow and unfollow accounts with live follower/following counts.
- **💬 Direct Messaging (DM)**:
  - Real-time conversation threads with delivery states.
  - Message contacts you follow.
  - Integrated with **QuSec Hardware Web Bridge** (`http://127.0.0.1:8765`) to monitor quantum fibre and ESP32 hardware status and dispatch messages over quantum teleportation links.
- **👤 User Profiles**:
  - Profile photo upload and avatar customizer.
  - Bio editing and account statistics (Posts, Followers, Following).
  - 3-column responsive photo grid with like & comment count overlays.
  - Authentic, strictly user-based content (no fake pre-made highlights).
- **📱 Fully Responsive Modern Instagram UX**:
  - Desktop: Left navigation sidebar with Grand Hotel cursive logo.
  - Mobile: Bottom navigation tab bar and sticky headers.

---

## 🌐 Live Production Deployment

The project is deployed live on Vercel at:
👉 **[https://shnik-lake.vercel.app](https://shnik-lake.vercel.app)**

---

## 🛠️ Tech Stack & Free-Tier Services

Shnik runs on 100% free tiers with zero credit card requirements:

| Component | Technology | Free Tier Provider |
| :--- | :--- | :--- |
| **Frontend & API** | Next.js 14 (App Router) + TypeScript | [Vercel](https://vercel.com) |
| **Styling** | Tailwind CSS + Lucide Icons | Built-in |
| **Authentication** | Supabase Auth (Pre-confirmed Username Accounts) | [Supabase](https://supabase.com) |
| **Database** | PostgreSQL + Row-Level Security (RLS) | [Supabase](https://supabase.com) |
| **Realtime** | Supabase Realtime Channels (WebSocket) | [Supabase](https://supabase.com) |
| **Media Storage** | Supabase Storage Buckets (`avatars`, `posts`) | [Supabase](https://supabase.com) |
| **Hardware Bridge** | QuSec Web Bridge Runtime (Port 8765) | Local Terminal Node |

---

## 🚀 Setup & Deployment Guide

### 1. Set Up Free Supabase Backend (~3 mins)

1. Sign up for free at **[supabase.com](https://supabase.com)** (sign in with GitHub).
2. Click **New Project** and name it `Shnik`.
3. In the left menu, open **SQL Editor**, paste the contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql), and click **Run**.
   * *This automatically provisions the `profiles`, `follows`, `messages`, `posts`, `post_likes`, `post_comments`, and `alerts` tables, RLS security policies, and storage buckets.*
4. In **Project Settings** → **API**:
   - Copy **Project URL** (`https://xyz.supabase.co`)
   - Copy **anon public key**
   - Copy **service_role secret key**
5. In **Authentication** → **Providers** → **Email**:
   - Toggle **OFF** **"Confirm email"** and click **Save**. *(Ensures instant username-only logins without requiring email links).*

---

### 2. Deploy to Vercel (~2 mins)

1. Sign in to **[vercel.com](https://vercel.com)** with your GitHub account.
2. Click **Add New** → **Project** and import `tShivam25/Shnik`.
3. Under **Environment Variables**, configure:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   NEXT_PUBLIC_MOCK=false
   ```
4. Click **Deploy**. Vercel will build and assign you your live production URL.

---

### 3. Local Development

To run Shnik locally on your machine:

```bash
# 1. Clone repository
git clone https://github.com/tShivam25/Shnik.git
cd Shnik

# 2. Install dependencies
npm install

# 3. Setup local environment variables
cp .env.example .env.local

# 4. Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔬 QuSec Hardware Web Bridge Integration

Shnik includes a client runtime bridge for connecting directly to a local QuSec hardware node running in your terminal on `http://127.0.0.1:8765`:

```html
<script src="/qusec-web-bridge.js"></script>
<script>
  const qusec = new QuSecBridge("http://127.0.0.1:8765");

  // Live hardware and session status
  qusec.onStatus((status) => {
    console.log("Session:", status.session_id);
    console.log("Fibre OK:", status.channel.fibre_ok);
    console.log("ESP32 OK:", status.channel.esp32_ok);
    console.log("Key Pool bits:", status.key_pool.available_bits);
  });

  // Decrypted incoming chat messages from peer
  qusec.onMessage((msg) => {
    displayChatMessage(msg.from, msg.text, msg.mode);
  });

  qusec.start();
</script>
```

When active, a green **QuSec Node** indicator appears in the chat header showing live Fibre status, ESP32 connection, and available key pool bits.

---

## 📄 License

This project is licensed under the MIT License.
