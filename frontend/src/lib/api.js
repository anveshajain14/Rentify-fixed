import axios from 'axios';

const rawApiUrl = '';
export const apiBaseUrl = '';
const debugApiBase = process.env.NEXT_PUBLIC_DEBUG_API === 'true';

if (debugApiBase) {
  console.log('[API] baseURL:', apiBaseUrl || '(relative)');
}

if (debugApiBase) {
  console.log('[API] baseURL:', apiBaseUrl || '(relative)');
}

const api = axios.create({
  baseURL: '', // Force relative URL so Next.js rewrites handle cross-domain cookies
  withCredentials: true,
});

export default api;
