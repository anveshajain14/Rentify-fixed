import dbConnect from '../lib/mongodb.js';
import { getAuthUser } from '../lib/auth.js';
import { isAdminRole, canPlaceOrders } from '../lib/roles.js';
import { isProductPubliclyRentable } from '../lib/productVisibility.js';
import OrderRequest from '../models/OrderRequest.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';

function normalizeAddress(input) {
  if (!input || typeof input !== 'object') return null;

  const fullName = input.fullName ?? input.name;
  const phone = input.phone;
  const street = input.street;
  const city = input.city;
  const state = input.state;
  const pincode = input.pincode;

  if (!fullName || !phone || !street || !city || !state || !pincode) return null;

  return {
    fullName: String(fullName).trim(),
    phone: String(phone).trim(),
    street: String(street).trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    pincode: String(pincode).trim(),
  };
}

async function ensureOrderFromRequest(orderRequest) {
  const existing = await Order.findOne({ orderRequestId: orderRequest._id });
  if (existing) return existing;

  const orderStatus = Number(orderRequest.cautionMoney) > 0 ? 'orderPlaced' : 'refundDone';

  return Order.create({
    orderRequestId: orderRequest._id,
    renterId: orderRequest.renterId,
    sellerId: orderRequest.sellerId,
    productId: orderRequest.productId,
    totalAmount: orderRequest.totalAmount,
    depositAmount: Number(orderRequest.cautionMoney || 0),
    cautionMoney: orderRequest.cautionMoney || 0,
    depositStatus: 'held',
    paymentStatus: 'pending',
    status: orderStatus,
  });
}

export async function createOrderRequest(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    if (!canPlaceOrders(user.role)) {
      return res.status(403).json({ message: 'Only users and sellers can create order requests' });
    }

    const {
      productId,
      days,
      deliveryType,
      deliveryCharge: bodyDeliveryCharge,
      totalAmount,
      addressId,
      address,
    } = req.body;

    if (!productId || !days || !deliveryType || totalAmount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['selfPickup', 'delivery'].includes(deliveryType)) {
      return res.status(400).json({ message: 'Invalid deliveryType' });
    }

    await dbConnect();

    const product = await Product.findById(productId).select('seller securityDeposit isApproved isActive');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!isProductPubliclyRentable(product)) {
      return res.status(400).json({ message: 'Product is not available for rent' });
    }

    if (String(product.seller) === String(user._id)) {
      return res.status(403).json({ message: 'You cannot create request for your own product' });
    }

    let finalAddress = normalizeAddress(address);
    if (!finalAddress && addressId) {
      const freshUser = await User.findById(user._id).select('addresses');
      const selected = freshUser?.addresses?.find((a) => String(a._id) === String(addressId));
      finalAddress = normalizeAddress(selected);
    }

    if (!finalAddress) {
      return res.status(400).json({ message: 'Valid address is required' });
    }

    const parsedDeliveryCharge =
      deliveryType === 'delivery'
        ? bodyDeliveryCharge !== undefined
          ? Number(bodyDeliveryCharge)
          : 100
        : 0;

    const parsedDays = Number(days);
    const parsedTotalAmount = Number(totalAmount);
    const parsedCautionMoney = Number(product.securityDeposit || 0);

    if (Number.isNaN(parsedDays) || parsedDays < 1) {
      return res.status(400).json({ message: 'Invalid days' });
    }
    if (Number.isNaN(parsedTotalAmount) || parsedTotalAmount < 0) {
      return res.status(400).json({ message: 'Invalid totalAmount' });
    }
    if (Number.isNaN(parsedDeliveryCharge) || parsedDeliveryCharge < 0) {
      return res.status(400).json({ message: 'Invalid deliveryCharge' });
    }
    if (Number.isNaN(parsedCautionMoney) || parsedCautionMoney < 0) {
      return res.status(400).json({ message: 'Invalid cautionMoney' });
    }

    const requestDoc = await OrderRequest.create({
      renterId: user._id,
      sellerId: product.seller,
      productId,
      days: parsedDays,
      deliveryType,
      address: finalAddress,
      deliveryCharge: parsedDeliveryCharge,
      totalAmount: parsedTotalAmount,
      cautionMoney: parsedCautionMoney,
      status: 'pending',
      rejectionReason: '',
    });

    createNotification({
      userId: product.seller,
      role: 'seller',
      message: 'New rental request received. Please review and accept/reject.',
      type: 'REQUEST',
      relatedId: requestDoc._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.status(201).json({ message: 'Order request created', orderRequest: requestDoc });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create order request' });
  }
}

export async function listOrderRequests(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    await dbConnect();

    const query = {};
    if (user.role === 'user' || user.role === 'renter') query.renterId = user._id;
    if (user.role === 'seller') query.sellerId = user._id;

    const orderRequests = await OrderRequest.find(query)
      .populate('productId', 'title images pricePerDay')
      .populate('renterId', 'name email')
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });

    const orderRequestIds = orderRequests.map((item) => item._id);
    const orders = await Order.find({ orderRequestId: { $in: orderRequestIds } }).sort({ createdAt: -1 });

    return res.json({ orderRequests, orders });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch order requests' });
  }
}

export async function acceptOrderRequest(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    if (user.role !== 'seller' && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Only seller can accept order requests' });
    }

    const { orderRequestId } = req.body;
    if (!orderRequestId) return res.status(400).json({ message: 'orderRequestId is required' });

    await dbConnect();
    const orderRequest = await OrderRequest.findById(orderRequestId);
    if (!orderRequest) return res.status(404).json({ message: 'Order request not found' });
    if (user.role === 'seller' && String(orderRequest.sellerId) !== String(user._id)) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }
    if (orderRequest.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${orderRequest.status}` });
    }

    orderRequest.status = 'accepted';
    orderRequest.rejectionReason = '';
    await orderRequest.save();

    const order = await ensureOrderFromRequest(orderRequest);

    createNotification({
      userId: orderRequest.renterId,
      role: 'renter',
      message: 'Your rental request was approved by the seller.',
      type: 'APPROVAL',
      relatedId: orderRequest._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    createNotification({
      userId: orderRequest.sellerId,
      role: 'seller',
      message: 'You approved a rental request. Order has been created/updated.',
      type: 'ORDER_UPDATE',
      relatedId: order?._id || orderRequest._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.json({ message: 'Order request accepted', orderRequest, order });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to accept order request' });
  }
}

export async function rejectOrderRequest(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    if (user.role !== 'seller' && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Only seller can reject order requests' });
    }

    const { orderRequestId, rejectionReason } = req.body;
    if (!orderRequestId) return res.status(400).json({ message: 'orderRequestId is required' });
    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({ message: 'rejectionReason is required' });
    }

    await dbConnect();
    const orderRequest = await OrderRequest.findById(orderRequestId);
    if (!orderRequest) return res.status(404).json({ message: 'Order request not found' });
    if (user.role === 'seller' && String(orderRequest.sellerId) !== String(user._id)) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }
    if (orderRequest.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${orderRequest.status}` });
    }

    orderRequest.status = 'rejected';
    orderRequest.rejectionReason = String(rejectionReason).trim();
    await orderRequest.save();

    createNotification({
      userId: orderRequest.renterId,
      role: 'renter',
      message: `Your rental request was rejected by the seller. Reason: ${orderRequest.rejectionReason}`,
      type: 'APPROVAL',
      relatedId: orderRequest._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.json({ message: 'Order request rejected', orderRequest });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to reject order request' });
  }
}

export async function createOrder(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { orderRequestId } = req.body;
    if (!orderRequestId) return res.status(400).json({ message: 'orderRequestId is required' });

    await dbConnect();

    const orderRequest = await OrderRequest.findById(orderRequestId);
    if (!orderRequest) return res.status(404).json({ message: 'Order request not found' });
    if (orderRequest.status !== 'accepted') {
      return res.status(400).json({ message: 'Order can only be created for accepted requests' });
    }
    if (!isAdminRole(user.role) && String(orderRequest.renterId) !== String(user._id) && String(orderRequest.sellerId) !== String(user._id)) {
      return res.status(403).json({ message: 'Not authorized to create this order' });
    }

    const order = await ensureOrderFromRequest(orderRequest);

    createNotification({
      userId: order.renterId,
      role: 'renter',
      message: 'Order placed successfully. You can track updates in your dashboard.',
      type: 'ORDER_UPDATE',
      relatedId: order._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.status(201).json({ message: 'Order created', order });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create order' });
  }
}

const statusSequence = ['orderPlaced', 'paymentDone', 'deliveryDone', 'returnDone', 'refundDone', 'completed'];

export async function getOrderById(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    await dbConnect();
    const order = await Order.findById(orderId)
      .populate('productId', 'title images pricePerDay')
      .populate('renterId', 'name email')
      .populate('sellerId', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isRenter = String(order.renterId?._id || order.renterId) === String(user._id);
    const isSeller = String(order.sellerId?._id || order.sellerId) === String(user._id);
    if (!isRenter && !isSeller && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    return res.json({ order });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch order' });
  }
}

export async function updateOrderPaymentStatus(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { orderId, paymentStatus } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });
    if (paymentStatus !== 'done') {
      return res.status(400).json({ message: 'paymentStatus must be done' });
    }

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isSeller = String(order.sellerId) === String(user._id);
    if (!isSeller && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Only seller can update payment status for COD orders' });
    }
    if (order.paymentMethod !== 'cod' && !isAdminRole(user.role)) {
      return res.status(400).json({ message: 'Manual update is only allowed for COD orders' });
    }

    order.paymentStatus = 'done';
    if (Number(order.depositAmount || order.cautionMoney || 0) > 0) {
      order.depositStatus = 'held';
    }
    if (statusSequence.indexOf(order.status) < statusSequence.indexOf('paymentDone')) {
      order.status = 'paymentDone';
    }
    await order.save();

    createNotification({
      userId: order.renterId,
      role: 'renter',
      message: 'Payment received for your order (COD confirmed).',
      type: 'PAYMENT',
      relatedId: order._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    createNotification({
      userId: order.sellerId,
      role: 'seller',
      message: 'Payment marked as received for an order (COD confirmed).',
      type: 'PAYMENT',
      relatedId: order._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.json({ message: 'Payment status updated', order });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update payment status' });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { orderId, status, paymentStatus } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isRenter = String(order.renterId) === String(user._id);
    const isSeller = String(order.sellerId) === String(user._id);

    if (!isAdminRole(user.role) && !isRenter && !isSeller) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    const oldStatus = order.status;
    const oldPaymentStatus = order.paymentStatus;

    if (paymentStatus !== undefined) {
      if (!['pending', 'done'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid paymentStatus' });
      }
      if (!isRenter && !isAdminRole(user.role)) {
        return res.status(403).json({ message: 'Only renter can update payment status' });
      }
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'done' && statusSequence.indexOf(order.status) < statusSequence.indexOf('paymentDone')) {
        order.status = 'paymentDone';
      }
    }

    if (status !== undefined) {
      if (!statusSequence.includes(status)) return res.status(400).json({ message: 'Invalid status' });

      if (!isSeller && !isAdminRole(user.role)) {
        return res.status(403).json({ message: 'Only seller can update timeline status' });
      }
      if (
        !isAdminRole(user.role) &&
        !['deliveryDone', 'returnDone', 'refundDone'].includes(status)
      ) {
        return res.status(400).json({
          message: 'Seller can only set deliveryDone, returnDone, or refundDone',
        });
      }

      const currentIndex = statusSequence.indexOf(order.status);
      const nextIndex = statusSequence.indexOf(status);

      if (nextIndex < currentIndex) {
        return res.status(400).json({ message: 'Order status cannot move backward' });
      }
      if (nextIndex - currentIndex > 1 && !isAdminRole(user.role)) {
        return res.status(400).json({ message: 'Order status can only move one step at a time' });
      }

      if (status === 'refundDone' && Number(order.cautionMoney) === 0) {
        order.status = 'completed';
      } else {
        order.status = status;
      }
      if (order.status === 'refundDone') {
        order.status = 'completed';
      }
    }

    if (Number(order.cautionMoney) === 0 && ['returnDone', 'refundDone'].includes(order.status)) {
      order.status = 'completed';
    }

    await order.save();

    if (oldPaymentStatus !== order.paymentStatus) {
      createNotification({
        userId: order.renterId,
        role: 'renter',
        message: `Payment status updated: ${order.paymentStatus}.`,
        type: 'PAYMENT',
        relatedId: order._id,
      }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));
    }

    if (oldStatus !== order.status) {
      createNotification({
        userId: order.renterId,
        role: 'renter',
        message: `Order update: ${order.status}.`,
        type: 'ORDER_UPDATE',
        relatedId: order._id,
      }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));
    }

    return res.json({ message: 'Order updated', order });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update order status' });
  }
}
