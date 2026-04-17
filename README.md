# LuxeRent – Rental Marketplace

A production-ready rental marketplace built with the MERN stack (Next.js, MongoDB, React). Role-based access for **Renters**, **Sellers**, and **Admins** with product listings, rental bookings, Stripe payments, and **public seller shop profiles**.

## Features

- **Renters:** Browse listings, view seller shops, rent products, leave reviews, wishlist, track rentals.
- **Sellers:** Register and request approval, manage **shop profile** (banner, avatar, bio, location, policies), add and manage products, track earnings, view reviews.
- **Admins:** Approve sellers and products, manage users, view analytics.

### Seller Shop / Public Profile

- Each approved seller has a **public storefront** at `/seller/:id`.
- Hero banner with parallax, seller avatar, name, location, joined date, verified badge.
- About, policies, **real stats** (avg rating, rentals completed, active listings, response rate), **rating distribution**, and **paginated reviews**.
- Product cards and product detail pages link **seller name/avatar to the seller shop**.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React, Tailwind CSS, Framer Motion, Redux Toolkit.
- **Backend:** Next.js API Routes, Mongoose (MongoDB).
- **Auth:** JWT (httpOnly cookies), Bcrypt.
- **Storage:** Cloudinary (product images, avatars, shop banners).
- **Payments:** Stripe (test mode).

## Project layout

The repo has **two folders**:

- **`frontend/`** – Next.js app (pages, components, Redux). This is where you run the app.
- **`backend/`** – API route handlers, models, and lib (used by `frontend/app/api` re-exports).

All env and config live under `frontend/` (e.g. `frontend/.env`, `frontend/package.json`).

## Setup

1. **Install dependencies**

   From the **frontend** folder:

   ```bash
   cd frontend
   npm install
   ```

2. **Environment variables**

   Copy `frontend/.env.example` to `frontend/.env` and set:

   - `MONGODB_URI` – MongoDB connection string (local or Atlas).
   - `CLOUDINARY_*` – Cloudinary credentials for image uploads.
   - `JWT_SECRET` – Random string for JWT signing.
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` – Stripe test keys.
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` – for "Continue with Google" (optional; see below).

3. **Run MongoDB**

   Ensure MongoDB is running (e.g. local on port 27017 or a hosted cluster).

4. **Google OAuth (optional – "Continue with Google")**

   1. Go to [Google Cloud Console](https://console.cloud.google.com/).
   2. Create or select a project.
   3. **APIs & Services → OAuth consent screen**: Configure (External, add your email as test user if in testing).
   4. **Credentials → Create credentials → OAuth client ID**; type **Web application**.
   5. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback` (add production URL when deploying).
   6. Copy **Client ID** and **Client Secret** into `frontend/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

   Without these vars, the Google login button redirects to login with an error.

5. **Start the app**

   From the **frontend** folder:

   ```bash
   cd frontend
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- **`frontend/app`** – Pages and API re-exports (re-exports point to `backend/`).
- **`frontend/app/seller/[id]`** – Public seller shop (SEO in layout).
- **`frontend/app/seller/dashboard`** – Seller dashboard (Overview + Shop Settings).
- **`backend/models`** – Mongoose schemas (User, Product, Rental, Review).
- **`backend/lib`** – DB, auth, Cloudinary, Stripe.
- **`frontend/components`** – Navbar, Footer, ProductCard, AnimatedCounter, etc.
- **`frontend/store`** – Redux (auth, cart, wishlist, filters, etc.).

## Cleanup (if you see old root folders)

If you still have `app/`, `src/`, `public/`, `node_modules/`, or `.next/` at the **repo root**, they are leftovers. Close the IDE and any dev servers, then delete them manually. The app runs only from **`frontend/`**; root-level copies are ignored in git and not used.

## API Summary

- **Public:** `GET /api/seller/:id` – Seller shop (approved only; includes products, reviews, stats, rating distribution). Supports `reviewPage` and `reviewLimit` for reviews.
- **Auth:** `POST /api/auth/login`, `register`, `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/auth/google` (OAuth), `GET /api/auth/google/callback`.
- **Seller:** `PATCH /api/seller/profile` – Update shop (avatar, banner, bio, location, policies); accepts `multipart/form-data`.
- **Products / Rentals / Reviews** – As used by the app (list, create, update, checkout, etc.).

## Deploy

- Set env vars in your host (Vercel, etc.).
- Optional: set `NEXT_PUBLIC_APP_URL` for correct canonical/OG URLs and webhooks.

This is a real product-ready codebase: no mock data, secure role-based access, and a full seller shop experience.
