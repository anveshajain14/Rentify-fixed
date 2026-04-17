## Project Summary
A complete, production-ready rental marketplace web application built with the MERN stack (implemented via Next.js for modern performance). The platform features role-based access for Renters, Sellers, and Admins, supporting product listings, rental bookings, secure payments via Stripe, and public seller shop profiles.

## Tech Stack
- **Frontend:** Next.js 15 (App Router), React, Tailwind CSS, Framer Motion, Redux Toolkit, Recharts.
- **Backend:** Next.js API Routes (Node.js runtime), Mongoose (MongoDB).
- **Authentication:** JWT with httpOnly cookies, Bcrypt for password hashing.
- **Storage:** Cloudinary for image uploads.
- **Payments:** Stripe (Test Mode).

## Architecture
- `src/app`: Page routes and API endpoints.
- `src/models`: Mongoose schemas for User, Product, Rental, and Review.
- `src/lib`: Shared utilities, database connection, and service configurations.
- `src/components`: Reusable UI components (shadcn/ui inspired).
- `src/hooks`: Custom React hooks for state and logic.
- `src/store`: Redux Toolkit store and slices.

## User Preferences
- Preferred tech stack: MERN (implemented as Next.js + MongoDB).
- Design style: Premium, modern, glassmorphism, smooth animations.
- Roles: Renter, Seller, Admin.

## Project Guidelines
- Use TypeScript for type safety.
- Follow mobile-first responsive design.
- Implement centralized error handling.
- Secure all sensitive routes with middleware.

## Common Patterns
- API routes in `src/app/api`.
- Models in `src/models`.
- Reusable components in `src/components`.
