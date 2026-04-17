import crypto from 'crypto';

const RESET_TOKEN_EXPIRY_MINUTES = 10;

export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getResetTokenExpiry() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);
  return expiry;
}
