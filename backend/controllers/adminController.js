import dbConnect from '../lib/mongodb.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Rental from '../models/Rental.js';
import Report from '../models/Report.js';
import * as adminService from '../services/adminService.js';
import { createNotification } from '../services/notificationService.js';

function handleError(res, error) {
  const status = error.statusCode || 500;
  return res.status(status).json({ message: error.message || 'Internal server error' });
}

export async function adminUsersGet(req, res) {
  try {
    await dbConnect();
    const users = await User.find({})
      .select('-password -emailVerificationOTP -loginOTP -passwordResetToken')
      .populate('approvedBy', 'name email')
      .sort({ joinedAt: -1 });
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function adminUsersPut(req, res) {
  try {
    const { userId, isApproved, isBlocked, isVerified } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await dbConnect();
    const update = {};
    if (typeof isBlocked === 'boolean') update.isBlocked = isBlocked;
    if (typeof isVerified === 'boolean') update.isVerified = isVerified;

    if (typeof isApproved === 'boolean') {
      update.isApproved = isApproved;
      const target = await User.findById(userId).select('role');
      if (target?.role === 'seller') {
        if (isApproved) {
          update.approvedBy = req.adminUser._id;
          update.approvedAt = new Date();
        } else {
          update.approvedBy = null;
          update.approvedAt = null;
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true })
      .select('-password')
      .populate('approvedBy', 'name email');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'User updated', user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function adminUsersDelete(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }

    await dbConnect();
    await User.findByIdAndDelete(userId);

    return res.json({ message: 'User deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function adminStats(req, res) {
  try {
    await dbConnect();
    const totalUsers = await User.countDocuments();
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalProducts = await Product.countDocuments();
    const pendingProducts = await Product.countDocuments({ isApproved: false });
    const pendingSellers = await User.countDocuments({ role: 'seller', isApproved: false });
    const totalRentals = await Rental.countDocuments();
    const totalEarnings = await Rental.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const stats = {
      totalUsers,
      totalSellers,
      totalProducts,
      pendingProducts,
      pendingSellers,
      totalRentals,
      totalEarnings: totalEarnings[0]?.total || 0,
    };

    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function adminReports(req, res) {
  try {
    await dbConnect();

    const reports = await Report.find({})
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email role isBlocked')
      .sort({ createdAt: -1 });

    const aggregated = await Report.aggregate([
      {
        $group: {
          _id: '$reportedUser',
          count: { $sum: 1 },
          lastReportAt: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const userMap = new Map();
    reports.forEach((r) => {
      if (r.reportedUser?._id) {
        userMap.set(String(r.reportedUser._id), r.reportedUser);
      }
    });

    const summary = aggregated.map((row) => {
      const u = userMap.get(String(row._id));
      return {
        reportedUserId: row._id,
        count: row.count,
        lastReportAt: row.lastReportAt,
        user: u || null,
      };
    });

    return res.json({ reports, summary });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load reports' });
  }
}

export async function adminApprovals(req, res) {
  try {
    const { type, id, isApproved } = req.body;
    if (!type || !id || typeof isApproved !== 'boolean') {
      return res.status(400).json({ message: 'type, id, and isApproved (boolean) are required' });
    }

    const result = await adminService.setApprovalState(type, id, isApproved, req.adminUser._id);

    if (result?.kind === 'product' && result.doc?.seller) {
      const approved = !!isApproved;
      createNotification({
        userId: result.doc.seller,
        role: 'seller',
        message: approved
          ? `Your product "${result.doc.title || 'listing'}" has been approved by admin.`
          : `Your product "${result.doc.title || 'listing'}" was rejected by admin. Please review and resubmit.`,
        type: 'APPROVAL',
        relatedId: result.doc._id,
      }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));
    }

    if (result?.kind === 'seller' && result.doc?._id) {
      const approved = !!isApproved;
      createNotification({
        userId: result.doc._id,
        role: 'seller',
        message: approved
          ? 'Your seller profile has been approved by admin. You can now list products.'
          : 'Your seller profile approval was revoked by admin. Please contact support.',
        type: 'APPROVAL',
        relatedId: result.doc._id,
      }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));
    }

    return res.json({ message: `${type} approval status updated` });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function makeAdmin(req, res) {
  try {
    const { userId } = req.params;
    const { user, alreadyAdmin } = await adminService.promoteUserToAdmin(userId, req.adminUser._id);
    const safe = await User.findById(user._id).select('-password');
    return res.json({
      message: alreadyAdmin ? 'User is already an admin' : 'User promoted to admin; seller listings deactivated if applicable',
      user: safe,
      alreadyAdmin,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function removeAdmin(req, res) {
  try {
    const { userId } = req.params;
    const { user, restoredRole } = await adminService.demoteAdmin(userId, req.adminUser._id);
    const safe = await User.findById(user._id).select('-password');
    return res.json({
      message: `Admin removed; account restored as ${restoredRole}`,
      user: safe,
      restoredRole,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function approveProduct(req, res) {
  try {
    const { id } = req.params;
    const { product, alreadyApproved } = await adminService.approveProduct(id, req.adminUser._id);
    const populated = await Product.findById(product._id)
      .populate('seller', 'name avatar location')
      .populate('approvedBy', 'name email');

    if (!alreadyApproved && populated?.seller?._id) {
      createNotification({
        userId: populated.seller._id,
        role: 'seller',
        message: `Your product "${populated.title || 'listing'}" has been approved by admin.`,
        type: 'APPROVAL',
        relatedId: populated._id,
      }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));
    }

    return res.json({
      message: alreadyApproved ? 'Product was already approved' : 'Product approved',
      product: populated,
      alreadyApproved,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function approveSeller(req, res) {
  try {
    const { id } = req.params;
    const { seller, alreadyApproved } = await adminService.approveSeller(id, req.adminUser._id);
    const populated = await User.findById(seller._id)
      .select('-password -emailVerificationOTP -loginOTP -passwordResetToken')
      .populate('approvedBy', 'name email');

    if (!alreadyApproved && populated?._id) {
      createNotification({
        userId: populated._id,
        role: 'seller',
        message: 'Your seller profile has been approved by admin. You can now list products.',
        type: 'APPROVAL',
        relatedId: populated._id,
      }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));
    }

    return res.json({
      message: alreadyApproved ? 'Seller was already approved' : 'Seller approved',
      seller: populated,
      alreadyApproved,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
