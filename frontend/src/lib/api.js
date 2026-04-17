import axios from 'axios';

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  process.env.VITE_API_BASE_URL?.trim() ||
  '';
export const apiBaseUrl = rawApiUrl.replace(/\/$/, '');

if (!apiBaseUrl && process.env.NODE_ENV === 'production') {
  // Surface misconfiguration early in Vercel logs without crashing the app.
  console.warn('NEXT_PUBLIC_API_URL is not set. API requests will use relative URLs.');
}

const api = axios.create({
  baseURL: apiBaseUrl || undefined,
  withCredentials: true,
});

export default api;
