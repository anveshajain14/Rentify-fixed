import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

function invalidIdError() {
  const err = new Error('Invalid id');
  err.statusCode = 400;
  return err;
}

/**
 * Global product approval: one row in DB; any admin approving sets isApproved + audit fields.
 */
export async function approveProduct(productId, adminId) {
  await dbConnect();
  if (!mongoose.isValidObjectId(productId)) throw invalidIdError();

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  if (product.isApproved) {
    return { product, alreadyApproved: true };
  }

  product.isApproved = true;
  product.approvedBy = adminId;
  product.approvedAt = new Date();
  await product.save();
  return { product, alreadyApproved: false };
}

/**
 * Seller approval lives on User (role seller). Same global semantics as products.
 */
export async function approveSeller(sellerUserId, adminId) {
  await dbConnect();
  if (!mongoose.isValidObjectId(sellerUserId)) throw invalidIdError();

  const seller = await User.findById(sellerUserId);
  if (!seller || seller.role !== 'seller') {
    const err = new Error('Seller not found');
    err.statusCode = 404;
    throw err;
  }
  if (seller.isApproved) {
    return { seller, alreadyApproved: true };
  }

  seller.isApproved = true;
  seller.approvedBy = adminId;
  seller.approvedAt = new Date();
  await seller.save();
  return { seller, alreadyApproved: false };
}

export async function promoteUserToAdmin(targetUserId, actorAdminId) {
  await dbConnect();
  if (!mongoose.isValidObjectId(targetUserId)) throw invalidIdError();

  if (String(targetUserId) === String(actorAdminId)) {
    const err = new Error('Use another admin to modify your role');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  if (user.role === 'admin') {
    return { user, alreadyAdmin: true };
  }

  if (user.role !== 'user' && user.role !== 'seller') {
    const err = new Error('Only users or sellers can be promoted to admin');
    err.statusCode = 400;
    throw err;
  }

  user.previousRole = user.role;

  if (user.role === 'seller') {
    await Product.updateMany({ seller: user._id }, { $set: { isActive: false } });
  }

  user.role = 'admin';
  await user.save();
  return { user, alreadyAdmin: false };
}

export async function demoteAdmin(targetUserId, actorAdminId) {
  await dbConnect();
  if (!mongoose.isValidObjectId(targetUserId)) throw invalidIdError();

  if (String(targetUserId) === String(actorAdminId)) {
    const err = new Error('Use another admin to demote your account');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  if (user.role !== 'admin') {
    const err = new Error('User is not an admin');
    err.statusCode = 400;
    throw err;
  }

  const nextRole = user.previousRole === 'seller' ? 'seller' : 'user';
  user.role = nextRole;
  await user.save();

  if (nextRole === 'seller') {
    await Product.updateMany({ seller: user._id }, { $set: { isActive: true } });
  }

  return { user, restoredRole: nextRole };
}

/**
 * Used by legacy PUT /api/admin/approvals (approve / reject).
 */
export async function setApprovalState(type, id, isApproved, adminId) {
  await dbConnect();
  if (!mongoose.isValidObjectId(id)) throw invalidIdError();

  const approved = !!isApproved;

  if (type === 'product') {
    const product = await Product.findById(id);
    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }
    product.isApproved = approved;
    if (approved) {
      product.approvedBy = adminId;
      product.approvedAt = new Date();
    } else {
      product.approvedBy = null;
      product.approvedAt = null;
    }
    await product.save();
    return { kind: 'product', doc: product };
  }

  if (type === 'seller') {
    const seller = await User.findById(id);
    if (!seller || seller.role !== 'seller') {
      const err = new Error('Seller not found');
      err.statusCode = 404;
      throw err;
    }
    seller.isApproved = approved;
    if (approved) {
      seller.approvedBy = adminId;
      seller.approvedAt = new Date();
    } else {
      seller.approvedBy = null;
      seller.approvedAt = null;
    }
    await seller.save();
    return { kind: 'seller', doc: seller };
  }

  const err = new Error('Invalid approval type');
  err.statusCode = 400;
  throw err;
}
