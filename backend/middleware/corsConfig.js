const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const isProduction = process.env.NODE_ENV === 'production';
const debugCors = process.env.DEBUG_CORS === 'true';

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin) {
  return (origin || '').trim().replace(/\/$/, '');
}

function isWildcardVercelPattern(originPattern) {
  return originPattern === '*.vercel.app' || originPattern === 'https://*.vercel.app';
}

function isAllowedByWildcard(origin) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  ...parseCsv(process.env.CORS_ALLOWED_ORIGINS),
]
  .map(normalizeOrigin)
  .filter(Boolean);

const allowAllVercelPreviews = configuredOrigins.some(isWildcardVercelPattern);
const exactAllowedOrigins = new Set(
  [...configuredOrigins.filter((origin) => !isWildcardVercelPattern(origin)), ...LOCAL_ORIGINS.map(normalizeOrigin)]
    .filter(Boolean)
);

export function isOriginAllowed(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true; // server-to-server, curl, health checks
  if (exactAllowedOrigins.has(normalizedOrigin)) return true;
  if (allowAllVercelPreviews && isAllowedByWildcard(normalizedOrigin)) return true;
  if (!isProduction && LOCAL_ORIGINS.includes(normalizedOrigin)) return true;
  return false;
}

export const corsOptions = {
  origin(origin, callback) {
    const normalizedOrigin = normalizeOrigin(origin);
    const allowed = isOriginAllowed(normalizedOrigin);
    if (debugCors) {
      console.log(`[CORS] origin=${normalizedOrigin || 'none'} allowed=${allowed}`);
    }
    if (allowed) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${normalizedOrigin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export const allowedOrigins = [...exactAllowedOrigins];
