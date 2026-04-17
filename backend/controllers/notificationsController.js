import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb.js';
import { getAuthUser } from '../lib/auth.js';
import Notification from '../models/Notification.js';

function mapUserRoleToNotificationRole(userRole) {
  if (userRole === 'user') return 'renter';
  if (userRole === 'seller') return 'seller';
  if (userRole === 'admin') return 'admin';
  return 'renter';
}

export async function listNotifications(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const limitRaw = req.query.limit;
    const limit = Math.max(1, Math.min(200, Number(limitRaw || 50)));

    await dbConnect();
    const notifications = await Notification.find({
      userId: user._id,
      role: mapUserRoleToNotificationRole(user.role),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid notification id' });

    await dbConnect();
    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Notification not found' });
    return res.json({ message: 'Notification marked as read', notification: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to mark as read' });
  }
}

export async function markAllRead(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    await dbConnect();
    const result = await Notification.updateMany(
      { userId: user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to mark all as read' });
  }
}

