import dbConnect from '../lib/mongodb.js';
import Rental from '../models/Rental.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import Product from '../models/Product.js';
import { getAuthUser } from '../lib/auth.js';
import { isAdminRole } from '../lib/roles.js';
import cloudinary from '../lib/cloudinary.js';
import Review from '../models/Review.js';

export async function chatbot(req, res) {
  const { aiChat } = await import('./aiController.js');
  return aiChat(req, res);
}

export async function smartListing(req, res) {
  const { aiSmartAnalyze } = await import('./aiController.js');
  return aiSmartAnalyze(req, res);
}

export async function reportUser(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { reportedUserId, reason } = req.body;
    if (!reportedUserId || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (String(reportedUserId) === String(user._id)) {
      return res.status(400).json({ message: 'You cannot report yourself' });
    }

    await dbConnect();
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Report.create({
      reporter: user._id,
      reportedUser: reportedUserId,
      reason,
    });

    return res.status(201).json({ message: 'Report submitted' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to submit report' });
  }
}

// Reviews endpoints moved to reviewsController.js (kept routes stable there).

export async function getSeller(req, res) {
  try {
    await dbConnect();
    const { id } = req.params;
    const reviewPage = Math.max(1, parseInt(req.query.reviewPage || '1', 10));
    const reviewLimit = Math.min(20, Math.max(5, parseInt(req.query.reviewLimit || '10', 10)));
    const reviewSkip = (reviewPage - 1) * reviewLimit;

    const seller = await User.findById(id).select('-password');
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' });
    }

    if (!seller.isApproved) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const products = await Product.find({ seller: id, isApproved: true, isActive: { $ne: false } }).sort({ createdAt: -1 });
    const productIds = products.map((p) => p._id);

    const [
      reviewsResult,
      totalReviews,
      rentalsPerProduct,
      reviewsPerProduct,
    ] = await Promise.all([
      Review.find({ targetType: 'seller', targetId: id })
        .populate('reviewerId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(reviewSkip)
        .limit(reviewLimit)
        .lean(),
      Review.countDocuments({ targetType: 'seller', targetId: id }),
      Rental.aggregate([
        { $match: { seller: id, rentalStatus: 'completed' } },
        { $group: { _id: '$product', rentalCount: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { targetType: 'product', targetId: { $in: productIds } } },
        {
          $group: {
            _id: '$targetId',
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const averageRating = seller.sellerAverageRating ?? 0;
    const activeListings = products.length;

    const reliabilityScore = Math.min(
      100,
      Math.round(
        (averageRating / 5) * 60 +
          Math.min(40, totalReviews * 2)
      )
    );

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const distAgg = await Review.aggregate([
      { $match: { targetType: 'seller', targetId: seller._id } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    distAgg.forEach((r) => {
      ratingDistribution[r._id] = r.count;
    });

    const rentalsMap = new Map((rentalsPerProduct || []).map((r) => [r._id.toString(), r.rentalCount || 0]));
    const reviewsMap = new Map(
      (reviewsPerProduct || []).map((r) => [
        r._id.toString(),
        {
          avgRating: r.avgRating ?? 0,
          reviewCount: r.reviewCount ?? 0,
        },
      ])
    );

    const topPicks = products
      .map((p) => {
        const idStr = p._id.toString();
        const rentalCount = rentalsMap.get(idStr) ?? 0;
        const reviewMeta = reviewsMap.get(idStr) || { avgRating: 0, reviewCount: 0 };
        return {
          productId: idStr,
          rentalCount,
          avgRating: reviewMeta.avgRating,
          reviewCount: reviewMeta.reviewCount,
        };
      })
      .sort((a, b) => {
        if (b.rentalCount !== a.rentalCount) return b.rentalCount - a.rentalCount;
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      })
      .slice(0, 3);

    return res.json({
      seller,
      products,
      reviews: reviewsResult,
      totalReviews,
      reviewPage,
      reviewLimit,
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        activeListings,
        totalReviews,
        reliabilityScore,
      },
      ratingDistribution,
      topPicks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return res.status(500).json({ message });
  }
}

export async function patchSellerProfile(req, res) {
  try {
    const user = req.sellerUser;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    await dbConnect();
    const bio = req.body.bio;
    const location = req.body.location;
    const policies = req.body.policies;
    const avatarFile = req.files?.avatar?.[0] || req.files?.avatar;
    const shopBannerFile = req.files?.shopBanner?.[0] || req.files?.shopBanner;

    const update = {};
    if (bio !== null && bio !== undefined) update.bio = bio;
    if (location !== null && location !== undefined) update.location = location;
    if (policies !== null && policies !== undefined) update.policies = policies;

    const uploadStream = (buffer, folder) =>
      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder }, (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }).end(buffer);
      });

    const av = Array.isArray(avatarFile) ? avatarFile[0] : avatarFile;
    if (av && av.size > 0) {
      update.avatar = await uploadStream(av.buffer, 'luxe-rent/avatars');
    }

    const bn = Array.isArray(shopBannerFile) ? shopBannerFile[0] : shopBannerFile;
    if (bn && bn.size > 0) {
      update.shopBanner = await uploadStream(bn.buffer, 'luxe-rent/banners');
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, { $set: update }, { new: true }).select('-password');

    return res.json({ message: 'Shop profile updated', user: updatedUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return res.status(500).json({ message });
  }
}

export async function getAddresses(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    await dbConnect();
    const u = await User.findById(user._id).select('addresses').lean();
    const addresses = (u?.addresses || []).map((addr) => ({
      ...addr,
      fullName: addr.fullName || addr.name || '',
    }));
    return res.json({ addresses });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch addresses' });
  }
}

export async function postAddress(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const { fullName, name, phone, street, city, state, pincode, isDefault } = req.body;
    const resolvedFullName = fullName ?? name;
    if (!resolvedFullName || !phone || !street || !city || !state || !pincode) {
      return res.status(400).json({
        message: 'Missing required fields: fullName, phone, street, city, state, pincode',
      });
    }
    await dbConnect();
    const doc = await User.findById(user._id);
    if (!doc) return res.status(404).json({ message: 'User not found' });
    const addresses = doc.addresses || [];
    const newAddr = {
      fullName: String(resolvedFullName).trim(),
      name: String(resolvedFullName).trim(),
      phone: String(phone).trim(),
      street: String(street).trim(),
      city: String(city).trim(),
      state: String(state).trim(),
      pincode: String(pincode).trim(),
      isDefault: Boolean(isDefault),
    };
    if (newAddr.isDefault) {
      addresses.forEach((a) => {
        a.isDefault = false;
      });
    }
    addresses.push(newAddr);
    if (addresses.length === 1) addresses[0].isDefault = true;
    doc.addresses = addresses;
    await doc.save();
    return res.json({ message: 'Address added', addresses: doc.addresses });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to add address' });
  }
}

export async function patchAddress(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Address id required' });
    const { fullName, name, phone, street, city, state, pincode, isDefault } = req.body;
    await dbConnect();
    const doc = await User.findById(user._id);
    if (!doc) return res.status(404).json({ message: 'User not found' });
    const addresses = doc.addresses || [];
    const idx = addresses.findIndex((a) => String(a._id) === String(id));
    if (idx < 0) return res.status(404).json({ message: 'Address not found' });
    const nextFullName = fullName ?? name;
    if (nextFullName !== undefined) {
      const normalized = String(nextFullName).trim();
      addresses[idx].fullName = normalized;
      addresses[idx].name = normalized;
    }
    if (phone !== undefined) addresses[idx].phone = String(phone).trim();
    if (street !== undefined) addresses[idx].street = String(street).trim();
    if (city !== undefined) addresses[idx].city = String(city).trim();
    if (state !== undefined) addresses[idx].state = String(state).trim();
    if (pincode !== undefined) addresses[idx].pincode = String(pincode).trim();
    if (isDefault === true) {
      addresses.forEach((a) => {
        a.isDefault = false;
      });
      addresses[idx].isDefault = true;
    }
    doc.addresses = addresses;
    await doc.save();
    return res.json({ message: 'Address updated', addresses: doc.addresses });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to update address' });
  }
}

export async function deleteAddress(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Address id required' });
    await dbConnect();
    const doc = await User.findById(user._id);
    if (!doc) return res.status(404).json({ message: 'User not found' });
    const addresses = (doc.addresses || []).filter((a) => String(a._id) !== String(id));
    if (addresses.length === doc.addresses.length) {
      return res.status(404).json({ message: 'Address not found' });
    }
    if (addresses.length > 0 && !addresses.some((a) => a.isDefault)) {
      addresses[0].isDefault = true;
    }
    doc.addresses = addresses;
    await doc.save();
    return res.json({ message: 'Address deleted', addresses: doc.addresses });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to delete address' });
  }
}
