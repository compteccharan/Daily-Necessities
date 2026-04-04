# Supabase setup (Verdail / Daily-Necessities)

This project is a static site (plain HTML/JS). That means `.env` is **not** loaded into the browser.
You must put your Supabase URL + key into `source/config.js`.

## 1) Create a Supabase project

1. Create a project in Supabase.
2. Go to **Settings → API**:
   - Copy **Project URL**
   - Copy **anon public** key (or **Publishable key** if your project shows it)

## 2) Add credentials to the app

Edit `source/config.js`:

- Set `CONFIG.SUPABASE_URL` to your **Project URL**
- Set `CONFIG.SUPABASE_ANON_KEY` to your **anon public** key

If these are missing/empty, you’ll see errors like:
- `No API key found in request`
- `Missing SUPABASE_URL or SUPABASE_ANON_KEY`

## 3) Create or migrate DB tables + RLS policies

Open Supabase **SQL Editor** and run `FIX_RLS_POLICY.sql`.

This creates:
- `user_profiles`
- `carts`
- `orders`
- `order_items`
- `wishlist`

It also:
- adds `product_image` support to cart and order items
- adds stored payment and delivery metadata to orders
- backfills older orders with `placed_at` and a 30-minute ETA
- recreates Row Level Security policies so each user can only access their own rows

## 4) Enable Email/Password auth (optional)

In Supabase **Authentication → Providers**:
- Enable **Email**

If sign-in shows `Invalid login credentials`:
- Confirm you’re using the same email/password you signed up with
- Check **Authentication → Users** (user exists?)
- If **Confirm email** is enabled, you must confirm the email before password sign-in works

## 5) Enable Google auth (recommended)

### A) Supabase settings

Supabase → **Authentication → Providers → Google**
- Enable Google provider
- Paste your Google **Client ID** and **Client Secret** (from Google Cloud Console)

Supabase → **Authentication → URL Configuration**
- **Site URL**:
  - Local dev example: `http://127.0.0.1:5500`
  - GitHub Pages example: `https://<username>.github.io/<repo>`
- **Additional Redirect URLs** (add all you use):
  - `http://127.0.0.1:5500`
  - `http://127.0.0.1:5500/index.html`
  - `http://localhost:5500`
  - `http://localhost:5500/index.html`
  - Your GitHub Pages URL(s), including `/index.html`

Notes:
- This app redirects back to `index.html` after Google login.
- Refresh/login persistence depends on Supabase being able to complete the OAuth callback and store the session.

### B) Google Cloud Console settings

Google Cloud Console → APIs & Services → Credentials:

1. Configure **OAuth consent screen** (External is fine for testing).
2. Create an **OAuth Client ID** of type **Web application**.
3. Add **Authorized JavaScript origins**:
   - `http://127.0.0.1:5500`
   - `http://localhost:5500`
   - Your production domain (GitHub Pages origin)
4. Add **Authorized redirect URI** (this is always the Supabase callback):
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`

## 6) Common errors and what they mean

### Where email/password are stored

Supabase stores email + password **inside Auth** (table `auth.users`).
The password is **hashed** and never stored in plain text.

Your app tables (`user_profiles`, `carts`, `orders`) do **not** store passwords.

### `No API key found in request`

Most common causes:
- Your app’s Supabase key is empty/undefined (fix `source/config.js`)
- You manually opened a Supabase Auth URL in the browser (that request has no `apikey` header — that’s expected)

### Logged out on refresh / after visiting cart

Most common causes:
- OAuth callback not being exchanged for a session (fixed by exchanging `?code=` on `index.html`)
- Pages using `supabase.auth.getUser()` (network call) instead of a session-first check

This repo now restores the session first across homepage, cart, checkout, receipt, and orders pages.

### `Account already exists` but can’t login

This usually means the email already exists in **Auth → Users**:
1. If it was created with Google sign-in, it won’t have a password yet.
2. Use **Reset Password** in Supabase to set one.
3. Or delete the user and sign up again with email/password.

## 7) Quick smoke test

1. Open `source/SignUp.html`, create an account.
2. Sign in from `source/Login.html` and confirm you land on `index.html` as logged in.
3. Refresh `index.html` — you should stay logged in.
4. Add items from `index.html` and confirm the cart badge increases.
5. Open `cart.html` and verify `+ / - / Delete` all work after refresh.
6. Open `checkout.html`, place:
   - one COD order
   - one demo card order
   - one demo UPI order
7. Confirm `order-confirmation.html?order=<id>` works after refresh.
8. Open `orders.html` and verify past orders, payment method/status, and ETA display correctly.
