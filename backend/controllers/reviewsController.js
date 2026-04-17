import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb.js';
import { getAuthUser } from '../lib/auth.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { isAdminRole } from '../lib/roles.js';

function isValidRating(r) {
  const n = Number(r);
  return Number.isFinite(n) && n >= 1 && n <= 5;
}

async function incrementCachedRating({ targetType, targetId, rating }) {
  const r = Number(rating);

  if (targetType === 'product') {
    await Product.updateOne(
      { _id: targetId },
      [
        {
          $set: {
            totalReviews: { $add: [{ $ifNull: ['$totalReviews', 0] }, 1] },
            averageRating: {
              $let: {
                vars: {
                  c: { $ifNull: ['$totalReviews', 0] },
                  a: { $ifNull: ['$averageRating', 0] },
                },
                in: {
                  $divide: [{ $add: [{ $multiply: ['$$a', '$$c'] }, r] }, { $add: ['$$c', 1] }],
                },
              },
            },
          },
        },
      ]
    );
    return;
  }

  if (targetType === 'seller') {
    await User.updateOne(
      { _id: targetId },
      [
        {
          $set: {
            sellerTotalReviews: { $add: [{ $ifNull: ['$sellerTotalReviews', 0] }, 1] },
            sellerAverageRating: {
              $let: {
                vars: {
                  c: { $ifNull: ['$sellerTotalReviews', 0] },
                  a: { $ifNull: ['$sellerAverageRating', 0] },
                },
                in: {
                  $divide: [{ $add: [{ $multiply: ['$$a', '$$c'] }, r] }, { $add: ['$$c', 1] }],
                },
              },
            },
          },
        },
      ]
    );
    return;
  }

  if (targetType === 'renter') {
    await User.updateOne(
      { _id: targetId },
      [
        {
          $set: {
            renterTotalReviews: { $add: [{ $ifNull: ['$renterTotalReviews', 0] }, 1] },
            renterAverageRating: {
              $let: {
                vars: {
                  c: { $ifNull: ['$renterTotalReviews', 0] },
                  a: { $ifNull: ['$renterAverageRating', 0] },
                },
                in: {
                  $divide: [{ $add: [{ $multiply: ['$$a', '$$c'] }, r] }, { $add: ['$$c', 1] }],
                },
              },
            },
          },
        },
      ]
    );
  }
}

export async function createReview(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { orderId, targetType, targetId, rating, review } = req.body || {};

    if (!orderId || !targetType || !targetId || !isValidRating(rating)) {
      return res.status(400).json({ message: 'orderId, targetType, targetId, and rating (1-5) are required' });
    }
    if (!['product', 'seller', 'renter'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid targetType' });
    }
    if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid orderId or targetId' });
    }

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'completed' && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'You can review only after order completion' });
    }

    const isRenter = String(order.renterId) === String(user._id);
    const isSeller = String(order.sellerId) === String(user._id);
    if (!isRenter && !isSeller && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Not authorized to review this order' });
    }

    // Role-based targets + strict linkage to order
    if (targetType === 'product') {
      if (!isRenter && !isAdminRole(user.role)) return res.status(403).json({ message: 'Only renter can review product' });
      if (String(order.productId) !== String(targetId)) return res.status(400).json({ message: 'targetId must match order productId' });
    }
    if (targetType === 'seller') {
      if (!isRenter && !isAdminRole(user.role)) return res.status(403).json({ message: 'Only renter can review seller' });
      if (String(order.sellerId) !== String(targetId)) return res.status(400).json({ message: 'targetId must match order sellerId' });
    }
    if (targetType === 'renter') {
      if (!isSeller && !isAdminRole(user.role)) return res.status(403).json({ message: 'Only seller can review renter' });
      if (String(order.renterId) !== String(targetId)) return res.status(400).json({ message: 'targetId must match order renterId' });
    }

    let doc;
    try {
      doc = await Review.create({
        reviewerId: user._id,
        targetType,
        targetId,
        orderId,
        rating: Number(rating),
        review: review != null ? String(review) : '',
      });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ message: 'You have already reviewed this for this order' });
      }
      throw err;
    }

    try {
      await incrementCachedRating({ targetType, targetId, rating: Number(rating) });
    } catch (cacheErr) {
      console.error('[reviews] failed to update rating cache:', cacheErr?.message || cacheErr);
    }

    return res.status(201).json({ message: 'Review submitted', review: doc });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to submit review' });
  }
}

export async function getProductReviews(req, res) {
  try {
    const { productId } = req.params;
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid productId' });
    }

    await dbConnect();
    const reviews = await Review.find({ targetType: 'product', targetId: productId })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    const statsAgg = await Review.aggregate([
      { $match: { targetType: 'product', targetId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      averageRating: Number(statsAgg?.[0]?.averageRating || 0),
      totalReviews: Number(statsAgg?.[0]?.totalReviews || 0),
    };

    // Keep Product cache in sync for listing cards / future reads.
    await Product.updateOne(
      { _id: productId },
      { $set: { averageRating: stats.averageRating, totalReviews: stats.totalReviews } }
    );

    return res.json({ stats, reviews });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch product reviews' });
  }
}

export async function getUserReviews(req, res) {
  try {
    const { userId } = req.params;
    const targetType = req.query.targetType;
    if (!userId || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'Invalid userId' });
    if (targetType && !['seller', 'renter'].includes(String(targetType))) {
      return res.status(400).json({ message: 'targetType must be seller or renter' });
    }

    await dbConnect();
    const u = await User.findById(userId)
      .select('sellerAverageRating sellerTotalReviews renterAverageRating renterTotalReviews role isApproved')
      .lean();
    if (!u) return res.status(404).json({ message: 'User not found' });

    const query = { targetId: userId };
    if (targetType) query.targetType = String(targetType);
    else query.targetType = { $in: ['seller', 'renter'] };

    const reviews = await Review.find(query)
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      seller: { averageRating: u.sellerAverageRating ?? 0, totalReviews: u.sellerTotalReviews ?? 0 },
      renter: { averageRating: u.renterAverageRating ?? 0, totalReviews: u.renterTotalReviews ?? 0 },
    };

    return res.json({ stats, reviews });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch user reviews' });
  }
}

// Backwards-compatible handler: supports ?productId= / ?sellerId=
export async function listReviewsLegacy(req, res) {
  try {
    const productId = req.query.productId;
    const sellerId = req.query.sellerId;
    if (!productId && !sellerId) return res.json({ reviews: [] });

    await dbConnect();
    const query = {};
    if (productId) {
      if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: 'Invalid productId' });
      query.targetType = 'product';
      query.targetId = productId;
    }
    if (sellerId) {
      if (!mongoose.isValidObjectId(sellerId)) return res.status(400).json({ message: 'Invalid sellerId' });
      query.targetType = 'seller';
      query.targetId = sellerId;
    }

    const reviews = await Review.find(query).populate('reviewerId', 'name avatar').sort({ createdAt: -1 }).lean();
    return res.json({ reviews });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function replyToReview(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { reviewId, comment } = req.body || {};
    if (!reviewId || !comment) return res.status(400).json({ message: 'Missing required fields' });
    if (!mongoose.isValidObjectId(reviewId)) return res.status(400).json({ message: 'Invalid reviewId' });

    await dbConnect();
    const doc = await Review.findById(reviewId);
    if (!doc) return res.status(404).json({ message: 'Review not found' });

    // Only seller (target) or admin can reply
    if (!isAdminRole(user.role) && !(doc.targetType === 'seller' && String(doc.targetId) === String(user._id))) {
      return res.status(403).json({ message: 'Not authorized to reply to this review' });
    }

    doc.reply = { comment: String(comment).trim(), createdAt: new Date() };
    await doc.save();
    return res.json({ message: 'Reply saved', reply: doc.reply });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to save reply' });
  }
}

