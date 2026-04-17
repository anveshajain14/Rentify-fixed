const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  ...parseCsv(process.env.CORS_ALLOWED_ORIGINS),
].filter(Boolean);

const allowedOrigins = [...new Set([...configuredOrigins, ...LOCAL_ORIGINS])];

export const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin/non-browser tools (server-to-server, curl, health checks).
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

export { allowedOrigins };
