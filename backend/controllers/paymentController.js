import crypto from 'crypto';
import dbConnect from '../lib/mongodb.js';
import { getAuthUser } from '../lib/auth.js';
import { isAdminRole } from '../lib/roles.js';
import Order from '../models/Order.js';
import { razorpay, razorpayKeyId } from '../lib/razorpay.js';
import { createNotification } from '../services/notificationService.js';

export async function createRazorpayOrder(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { orderId, amount } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });
    if (!razorpay || !razorpayKeyId) {
      return res.status(503).json({ message: 'Razorpay is not configured' });
    }

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isRenter = String(order.renterId) === String(user._id);
    if (!isRenter && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Only renter can pay for this order' });
    }

    const totalAmount = Number(order.totalAmount || 0);
    const depositAmount = Number(order.depositAmount || order.cautionMoney || 0);
    const payableAmount = totalAmount > 0 ? totalAmount : Number(amount);
    const finalAmount = Number.isFinite(payableAmount) ? payableAmount : Number(amount ?? order.totalAmount);
    if (Number.isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      receipt: `rentify_${order._id.toString().slice(-8)}_${Date.now()}`,
      notes: {
        appOrderId: String(order._id),
      },
    });

    order.paymentMethod = 'online';
    order.razorpayOrderId = razorpayOrder.id;
    if (depositAmount > 0) order.depositStatus = 'held';
    await order.save();

    return res.json({
      razorpayOrderId: razorpayOrder.id,
      keyId: razorpayKeyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: order._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create Razorpay order' });
  }
}

export async function verifyRazorpayPayment(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const {
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: 'Missing Razorpay verification fields' });
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: 'Razorpay is not configured' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expected !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isRenter = String(order.renterId) === String(user._id);
    if (!isRenter && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Only renter can verify payment for this order' });
    }

    order.paymentMethod = 'online';
    order.paymentStatus = 'done';
    order.status = 'paymentDone';
    order.razorpayOrderId = razorpayOrderId;
    order.razorpayPaymentId = razorpayPaymentId;
    if (Number(order.depositAmount || order.cautionMoney || 0) > 0) {
      order.depositStatus = 'held';
    }
    await order.save();

    createNotification({
      userId: order.sellerId,
      role: 'seller',
      message: 'Payment received for an order (Razorpay successful).',
      type: 'PAYMENT',
      relatedId: order._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    createNotification({
      userId: order.renterId,
      role: 'renter',
      message: 'Payment successful. Your order is now in progress.',
      type: 'PAYMENT',
      relatedId: order._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.json({ message: 'Payment verified', order });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to verify payment' });
  }
}

export async function refundDeposit(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { orderId, damageDeduction = 0 } = req.body || {};
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isSellerOwner = String(order.sellerId) === String(user._id);
    if (!isSellerOwner && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Only seller or admin can release deposit' });
    }

    const depositAmount = Number(order.depositAmount || order.cautionMoney || 0);
    if (depositAmount <= 0) {
      return res.status(400).json({ message: 'This order has no security deposit' });
    }
    if (order.depositStatus !== 'held') {
      return res.status(400).json({ message: `Deposit already processed (${order.depositStatus})` });
    }

    const deduction = Math.max(0, Number(damageDeduction || 0));
    if (Number.isNaN(deduction)) return res.status(400).json({ message: 'Invalid damageDeduction' });
    if (deduction > depositAmount) return res.status(400).json({ message: 'damageDeduction cannot exceed deposit amount' });

    const refundAmount = Math.max(0, depositAmount - deduction);
    let message = '';
    let depositRefundId = '';

    if (deduction === 0) {
      // Full refund
      if (!order.razorpayPaymentId) {
        return res.status(400).json({ message: 'Razorpay payment id not found for this order' });
      }
      if (!razorpay) return res.status(503).json({ message: 'Razorpay is not configured' });
      const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100),
        notes: { orderId: String(order._id) },
      });
      depositRefundId = refund?.id || '';
      order.depositStatus = 'refunded';
      message = 'Your security deposit has been fully refunded.';
    } else if (deduction < depositAmount) {
      // Partial refund
      if (!order.razorpayPaymentId) {
        return res.status(400).json({ message: 'Razorpay payment id not found for this order' });
      }
      if (!razorpay) return res.status(503).json({ message: 'Razorpay is not configured' });
      const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100),
        notes: { orderId: String(order._id) },
      });
      depositRefundId = refund?.id || '';
      order.depositStatus = 'partially_refunded';
      message = 'Your security deposit has been partially refunded. Deduction applied.';
    } else {
      // Forfeited
      order.depositStatus = 'forfeited';
      message = 'Your security deposit has been forfeited due to reported damages.';
    }

    order.depositRefundId = depositRefundId;
    await order.save();

    createNotification({
      userId: order.renterId,
      role: 'renter',
      message: `${message} (Order: ${String(order._id).slice(-8)}, Refund: ₹${refundAmount.toFixed(2)}, Deduction: ₹${deduction.toFixed(2)})`,
      type: 'PAYMENT',
      relatedId: order._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.json({
      message: 'Deposit processed successfully',
      order,
      refundAmount,
      deduction,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to process deposit refund' });
  }
}

export async function setCodPaymentPending(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isRenter = String(order.renterId) === String(user._id);
    if (!isRenter && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Only renter can select COD' });
    }

    order.paymentMethod = 'cod';
    order.paymentStatus = 'pending';
    if (order.status === 'paymentDone') order.status = 'orderPlaced';
    await order.save();

    createNotification({
      userId: order.sellerId,
      role: 'seller',
      message: 'New COD order placed. Payment will be collected on delivery/pickup.',
      type: 'ORDER_UPDATE',
      relatedId: order._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.json({ message: 'COD selected', order });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to set COD' });
  }
}
