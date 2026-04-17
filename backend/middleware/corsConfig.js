const FRONTEND_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
};
