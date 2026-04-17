import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '../lib/mongodb.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { signToken, setAuthCookie, removeAuthCookie, getAuthUser } from '../lib/auth.js';
import { generateOTP, hashOTP, getOTPExpiry, verifyOTP } from '../lib/otp.js';
import { sendVerificationEmail, sendLoginOTPEmail, sendPasswordResetEmail } from '../lib/email.js';
import { generateResetToken, hashResetToken, getResetTokenExpiry } from '../lib/token.js';
import { canResendOTP, updateResendCount } from '../lib/rateLimit.js';
import { getClientInfo } from '../lib/clientInfo.js';
import { isAdminRole, isSellerRole } from '../lib/roles.js';
import { notifyAdmins } from '../services/notificationService.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const ENABLE_LOGIN_OTP = process.env.ENABLE_LOGIN_OTP === 'true';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function frontendBase() {
  return process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function apiPublicBase() {
  return process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
}

function isStrongPassword(password) {
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}

export async function register(req, res) {
  try {
    await dbConnect();
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const normalizedRole = role === 'seller' ? 'seller' : 'user';
    if (role && role !== 'seller' && role !== 'user') {
      return res.status(400).json({ message: 'Invalid role. Must be user or seller.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const otpExpiry = getOTPExpiry();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
      previousRole: 'user',
      isVerified: false,
      emailVerificationOTP: hashedOtp,
      otpExpiry,
      otpResendCount: 0,
      otpResendWindow: new Date(),
    });

    if (normalizedRole === 'seller') {
      notifyAdmins({
        message: `New seller request: ${user.name} (${user.email}) is waiting for approval.`,
        type: 'REQUEST',
        relatedId: user._id,
      }).catch((err) => console.error('[notifications] notifyAdmins failed:', err?.message || err));
    }

    await sendVerificationEmail(user.email, otp, 7);

    return res.status(201).json({
      message: 'Account created. Please verify your email.',
      redirect: '/verify-email',
      email: user.email,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: false,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

export async function login(req, res) {
  try {
    await dbConnect();
    const { email, password } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await AuditLog.create({ action: 'login_failed', email, ip, userAgent, metadata: { reason: 'not_found' } });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked. Contact support.' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await AuditLog.create({ action: 'login_locked', userId: user._id, email, ip, userAgent });
      return res.status(423).json({
        message: 'Account temporarily locked due to too many failed attempts. Try again later.',
        lockedUntil: user.lockedUntil,
      });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
      await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockedUntil: null });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: newAttempts };
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await User.findByIdAndUpdate(user._id, updates);
      await AuditLog.create({
        action: 'login_failed',
        userId: user._id,
        email,
        ip,
        userAgent,
        metadata: { attempts: newAttempts },
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
    }

    if (ENABLE_LOGIN_OTP) {
      const otp = generateOTP();
      const hashedOtp = await hashOTP(otp);
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);
      await User.findByIdAndUpdate(user._id, {
        loginOTP: hashedOtp,
        loginOTPExpiry: otpExpiry,
      });
      await sendLoginOTPEmail(user.email, otp);
      return res.status(200).json({
        message: 'OTP sent to your email',
        requiresOtp: true,
        email: user.email,
        redirect: '/verify-login-otp',
      });
    }

    await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockedUntil: null });

    const token = signToken({
      id: user._id,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
    });
    setAuthCookie(res, token);

    await AuditLog.create({ action: 'login', userId: user._id, email, ip, userAgent });

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function loginOtp(req, res) {
  try {
    await dbConnect();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first.' });
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

    await User.findByIdAndUpdate(user._id, {
      loginOTP: hashedOtp,
      loginOTPExpiry: otpExpiry,
    });

    await sendLoginOTPEmail(user.email, otp);

    return res.json({
      message: 'OTP sent to your email',
      email: user.email,
      redirect: '/verify-login-otp',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function verifyLoginOtp(req, res) {
  try {
    await dbConnect();
    const { email, otp } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    if (!user.loginOTP || !user.loginOTPExpiry) {
      return res.status(400).json({ message: 'No login OTP pending. Please sign in again.' });
    }

    if (new Date() > new Date(user.loginOTPExpiry)) {
      return res.status(400).json({ message: 'Login code expired. Please sign in again.' });
    }

    const valid = await verifyOTP(otp, user.loginOTP);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    await User.findByIdAndUpdate(user._id, {
      loginOTP: null,
      loginOTPExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const token = signToken({
      id: user._id,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
    });
    setAuthCookie(res, token);

    await AuditLog.create({ action: 'login', userId: user._id, email, ip, userAgent, metadata: { via: 'otp' } });

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function me(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function logout(req, res) {
  removeAuthCookie(res);
  return res.json({ message: 'Logged out successfully' });
}

export async function forgotPassword(req, res) {
  try {
    await dbConnect();
    const { email } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await AuditLog.create({ action: 'reset_request', email, ip, userAgent, metadata: { exists: false } });
      return res.json({ message: 'If this email exists, a reset link will be sent.' });
    }

    const token = generateResetToken();
    const hashedToken = hashResetToken(token);
    const expiry = getResetTokenExpiry();

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpiry: expiry,
    });

    await sendPasswordResetEmail(user.email, token);
    await AuditLog.create({ action: 'reset_request', userId: user._id, email, ip, userAgent, metadata: { exists: true } });

    return res.json({ message: 'If this email exists, a reset link will be sent.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function resetPassword(req, res) {
  try {
    await dbConnect();
    const { token, password } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = hashResetToken(token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      await AuditLog.create({ action: 'reset_failed', email: null, ip, userAgent, metadata: { reason: 'invalid_expired' } });
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
      sessionVersion: (user.sessionVersion || 0) + 1,
    });

    removeAuthCookie(res);
    await AuditLog.create({ action: 'reset_success', userId: user._id, email: user.email, ip, userAgent });

    return res.json({
      message: 'Password reset successfully',
      redirect: '/login',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function verifyEmail(req, res) {
  try {
    await dbConnect();
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Email already verified', redirect: '/login' });
    }

    if (!user.emailVerificationOTP || !user.otpExpiry) {
      return res.status(400).json({ message: 'No verification pending. Please request a new code.' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    const valid = await verifyOTP(otp, user.emailVerificationOTP);
    if (!valid) {
      await AuditLog.create({ action: 'verify_otp', email, metadata: { success: false } });
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    await User.findByIdAndUpdate(user._id, {
      isVerified: true,
      emailVerificationOTP: null,
      otpExpiry: null,
      otpResendCount: 0,
      otpResendWindow: null,
    });

    await AuditLog.create({ action: 'verify_otp', userId: user._id, email, metadata: { success: true } });

    return res.json({
      message: 'Email verified successfully',
      redirect: '/login',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function resendVerificationOtp(req, res) {
  try {
    await dbConnect();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If this email exists, a verification code will be sent.' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Email already verified', redirect: '/login' });
    }

    const { allowed, remaining } = canResendOTP(user);
    if (!allowed) {
      return res.status(429).json({
        message: 'Too many attempts. Please try again in an hour.',
        retryAfter: 3600,
      });
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const otpExpiry = getOTPExpiry();
    const { count, window } = updateResendCount(user);

    await User.findByIdAndUpdate(user._id, {
      emailVerificationOTP: hashedOtp,
      otpExpiry,
      otpResendCount: count,
      otpResendWindow: window,
    });

    await sendVerificationEmail(user.email, otp, 7);
    await AuditLog.create({ action: 'resend_otp', userId: user._id, email });

    return res.json({
      message: 'Verification code sent',
      remaining,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export function googleAuthStart(req, res) {
  if (!GOOGLE_CLIENT_ID) {
    const base = frontendBase();
    return res.redirect(`${base}/login?error=oauth_not_configured`);
  }

  const state = crypto.randomBytes(32).toString('hex');
  const redirectUri = `${apiPublicBase()}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  res.cookie('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600000,
    path: '/',
  });

  return res.redirect(googleAuthUrl);
}

export async function googleAuthCallback(req, res) {
  const base = frontendBase();

  function redirectToLogin(error) {
    const url = new URL('/login', base);
    if (error) url.searchParams.set('error', error);
    res.clearCookie('google_oauth_state', { path: '/' });
    return res.redirect(url.toString());
  }

  try {
    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;

    if (error) {
      if (error === 'access_denied') {
        return redirectToLogin('google_cancelled');
      }
      return redirectToLogin('google_failed');
    }

    if (!code || !state) {
      return redirectToLogin('invalid_callback');
    }

    const savedState = req.cookies?.google_oauth_state;
    if (!savedState || savedState !== state) {
      return redirectToLogin('invalid_state');
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return redirectToLogin('oauth_not_configured');
    }

    const redirectUri = `${apiPublicBase()}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error('Google token error:', errData);
      return redirectToLogin('token_exchange_failed');
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      return redirectToLogin('userinfo_failed');
    }

    const profile = await userInfoRes.json();
    const { id: googleId, email, name, picture } = profile;

    if (!email) {
      return redirectToLogin('no_email');
    }

    const { ip, userAgent } = getClientInfo(req);
    await dbConnect();

    let user = await User.findOne({ googleId });
    if (user) {
      if (user.isBlocked) {
        return redirectToLogin('account_blocked');
      }
    } else {
      user = await User.findOne({ email });
      if (user) {
        if (user.isBlocked) {
          return redirectToLogin('account_blocked');
        }
        user.googleId = googleId;
        user.isVerified = true;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      } else {
        user = await User.create({
          name: name || email.split('@')[0],
          email,
          googleId,
          avatar: picture || '',
          authProvider: 'google',
          isVerified: true,
          role: 'user',
          previousRole: 'user',
        });
      }
    }

    const token = signToken({
      id: user._id,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
    });
    setAuthCookie(res, token);

    await AuditLog.create({
      action: 'login',
      userId: user._id,
      email: user.email,
      ip,
      userAgent,
      metadata: { provider: 'google' },
    });

    let redirectUrl = '/';
    if (isAdminRole(user.role)) redirectUrl = '/admin';
    else if (isSellerRole(user.role)) redirectUrl = '/seller/dashboard';
    res.clearCookie('google_oauth_state', { path: '/' });
    return res.redirect(new URL(redirectUrl, base).toString());
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return redirectToLogin('server_error');
  }
}
