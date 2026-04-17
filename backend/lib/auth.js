import jwt from 'jsonwebtoken';
import dbConnect from './mongodb.js';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export function signToken(payload) {
  return jwt.sign({ ...payload, sessionVersion: payload.sessionVersion ?? 0 }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getAuthUser(req) {
  const token = req.cookies?.token;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) return null;

  await dbConnect();
  const user = await User.findById(decoded.id).select('-password');
  if (!user) return null;
  if (user.sessionVersion !== (decoded.sessionVersion ?? 0)) return null;
  return user;
}

export function setAuthCookie(res, token) {
  res.cookie('token', token, COOKIE_OPTS);
}

export function removeAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    path: '/',
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
}
