import axios from 'axios';

const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const apiBaseUrl = raw.replace(/\/$/, '');

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export default api;
