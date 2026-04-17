import dbConnect from '../lib/mongodb.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmailNotification } from './emailService.js';

function normalizeRole(role) {
  if (role === 'user') return 'renter';
  if (role === 'admin' || role === 'seller' || role === 'renter') return role;
  return 'renter';
}

export async function createNotification({ userId, role, message, type, relatedId }) {
  if (!userId) throw new Error('createNotification: userId is required');
  if (!message) throw new Error('createNotification: message is required');
  if (!type) throw new Error('createNotification: type is required');

  await dbConnect();

  const finalRole = normalizeRole(role);
  const doc = await Notification.create({
    userId,
    role: finalRole,
    message: String(message),
    type,
    relatedId: relatedId || undefined,
  });

  // Email is mandatory by spec, but we must not break workflows if SMTP fails.
  try {
    const user = await User.findById(userId).select('email name role');
    const email = user?.email;
    const subject = `Rentify: ${type.replaceAll('_', ' ')}`;
    await sendEmailNotification(email, subject, String(message));
  } catch (err) {
    console.error('[notifications] email send failed:', err?.message || err);
  }

  return doc;
}

export async function notifyAdmins({ message, type = 'SYSTEM', relatedId }) {
  await dbConnect();
  const admins = await User.find({ role: 'admin' }).select('_id role');
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a._id,
        role: 'admin',
        message,
        type,
        relatedId,
      })
    )
  );
}

