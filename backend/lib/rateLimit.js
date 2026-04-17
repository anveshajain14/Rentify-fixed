const RESEND_MAX = 3;
const RESEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function canResendOTP(user) {
  const now = new Date();
  if (!user.otpResendWindow || new Date(user.otpResendWindow) < new Date(now.getTime() - RESEND_WINDOW_MS)) {
    return { allowed: true, remaining: RESEND_MAX };
  }
  const count = user.otpResendCount || 0;
  if (count >= RESEND_MAX) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: RESEND_MAX - count };
}

export function updateResendCount(user) {
  const now = new Date();
  let count = user.otpResendCount || 0;
  let window = user.otpResendWindow;

  if (!window || new Date(window) < new Date(now.getTime() - RESEND_WINDOW_MS)) {
    count = 0;
    window = now;
  }
  count += 1;
  return { count, window };
}
