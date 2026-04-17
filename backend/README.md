# Backend

This folder contains API route handlers, models, and shared lib (auth, DB, Stripe, Cloudinary). It is **not** a standalone server.

**To run the app:** from the repo root go to the **frontend** folder and run:

```bash
cd frontend
npm install
npm run dev
```

Next.js will serve both the UI and the API; `frontend/app/api/*` re-exports the handlers from this folder.
