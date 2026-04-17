import bcrypt from 'bcryptjs';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 7;

export function generateOTP() {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

export function getOTPExpiry() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
}

export async function hashOTP(otp) {
  return bcrypt.hash(otp, 10);
}

export async function verifyOTP(plainOtp, hashedOtp) {
  return bcrypt.compare(plainOtp, hashedOtp);
}
