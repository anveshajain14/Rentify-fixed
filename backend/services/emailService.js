import nodemailer from 'nodemailer';

function getTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendEmailNotification(userEmail, subject, message) {
  const transport = getTransport();
  const fromEmail = process.env.SMTP_FROM || process.env.EMAIL_USER || 'no-reply@rentify.local';
  const appName = process.env.APP_NAME || 'Rentify';

  if (!userEmail) return { skipped: true, reason: 'missing_recipient' };
  if (!transport) {
    console.warn('[email] Email not configured (missing EMAIL_USER/EMAIL_PASS); skipping email send');
    return { skipped: true, reason: 'smtp_not_configured' };
  }

  const safeSubject = subject || 'Rentify Notification';
  const safeMessage = message || '';

  await transport.sendMail({
    from: `"${appName}" <${fromEmail}>`,
    to: userEmail,
    subject: safeSubject,
    text: safeMessage,
    html: `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin:0 0 12px 0;">${escapeHtml(safeSubject)}</h2>
        <p style="margin:0 0 16px 0; white-space: pre-line;">${escapeHtml(safeMessage)}</p>
        <p style="margin:0; color:#64748b; font-size:12px;">This is an automated message from Rentify.</p>
      </div>
    `,
  });

  return { sent: true };
}

function escapeHtml(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

