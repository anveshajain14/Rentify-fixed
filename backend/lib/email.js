import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const APP_NAME = process.env.APP_NAME || 'Rentify';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000';

function getEmailTemplate(type, data) {
  const styles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .logo { font-size: 24px; font-weight: 800; color: #000; margin-bottom: 24px; }
    .logo span { color: #059669; }
    .otp { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #059669; background: #ecfdf5; padding: 16px 24px; border-radius: 12px; display: inline-block; margin: 24px 0; }
    .expiry { color: #6b7280; font-size: 14px; margin-top: 8px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; }
    .btn { display: inline-block; background: #000; color: #fff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { color: #9ca3af; font-size: 12px; margin-top: 32px; }
  `;

  switch (type) {
    case 'verification':
      return `
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head>
        <body><div class="container"><div class="card">
          <div class="logo">${APP_NAME}</div>
          <h1 style="margin:0 0 8px; font-size:22px;">Verify your email</h1>
          <p style="color:#6b7280; margin:0;">Enter this code to complete your registration:</p>
          <div class="otp">${data.otp}</div>
          <p class="expiry">Expires in ${data.expiryMinutes || 7} minutes</p>
          <div class="warning">Never share this code with anyone. ${APP_NAME} will never ask for it.</div>
          <p class="footer">If you didn't create an account, you can safely ignore this email.</p>
        </div></div></body></html>
      `;
    case 'login-otp':
      return `
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head>
        <body><div class="container"><div class="card">
          <div class="logo">${APP_NAME}</div>
          <h1 style="margin:0 0 8px; font-size:22px;">Your login code</h1>
          <p style="color:#6b7280; margin:0;">Use this code to sign in:</p>
          <div class="otp">${data.otp}</div>
          <p class="expiry">Expires in 5 minutes</p>
          <div class="warning">If you didn't request this code, secure your account immediately.</div>
          <p class="footer">If you didn't try to log in, change your password right away.</p>
        </div></div></body></html>
      `;
    case 'reset-password':
      return `
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head>
        <body><div class="container"><div class="card">
          <div class="logo">${APP_NAME}</div>
          <h1 style="margin:0 0 8px; font-size:22px;">Reset your password</h1>
          <p style="color:#6b7280; margin:0;">Click the button below to set a new password:</p>
          <a href="${data.resetUrl}" class="btn">Reset Password</a>
          <p class="expiry" style="margin-top:16px;">This link expires in 10 minutes.</p>
          <div class="warning">If you didn't request a password reset, ignore this email. Your password will remain unchanged.</div>
          <p class="footer">If the button doesn't work, copy and paste: ${data.resetUrl}</p>
        </div></div></body></html>
      `;
    default:
      return '';
  }
}

export async function sendVerificationEmail(email, otp, expiryMinutes = 7) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured. OTP:', otp);
    return;
  }
  await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Verify your email - ${APP_NAME}`,
    html: getEmailTemplate('verification', { otp, expiryMinutes }),
  });
}

export async function sendLoginOTPEmail(email, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured. OTP:', otp);
    return;
  }
  await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your login code - ${APP_NAME}`,
    html: getEmailTemplate('login-otp', { otp }),
  });
}

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured. Reset URL:', resetUrl);
    return;
  }
  await transporter.sendMail({
    from: `"${APP_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Reset your password - ${APP_NAME}`,
    html: getEmailTemplate('reset-password', { resetUrl }),
  });
}
