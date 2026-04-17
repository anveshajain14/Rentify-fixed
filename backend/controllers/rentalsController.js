import { stripe } from '../lib/stripe.js';
import dbConnect from '../lib/mongodb.js';
import Rental from '../models/Rental.js';
import Product from '../models/Product.js';
import { getAuthUser } from '../lib/auth.js';
import { isAdminRole, canPlaceOrders } from '../lib/roles.js';
import { isProductPubliclyRentable } from '../lib/productVisibility.js';
import { createNotification } from '../services/notificationService.js';

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000'
  );
}

function toAddressSnapshot(addr) {
  if (!addr || typeof addr !== 'object') return undefined;
  return {
    name: addr.name != null ? String(addr.name) : '',
    phone: addr.phone != null ? String(addr.phone) : '',
    street: addr.street != null ? String(addr.street) : '',
    city: addr.city != null ? String(addr.city) : '',
    state: addr.state != null ? String(addr.state) : '',
    pincode: addr.pincode != null ? String(addr.pincode) : '',
  };
}

export async function listRentals(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    await dbConnect();
    let query = {};
    if (user.role === 'user' || user.role === 'renter') query.renter = user._id;
    else if (user.role === 'seller') query.seller = user._id;
    else if (isAdminRole(user.role)) query = {};

    const rentals = await Rental.find(query)
      .populate('product', 'title images pricePerDay')
      .populate('renter', 'name email')
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ rentals });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function createRental(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!canPlaceOrders(user.role)) {
      return res.status(403).json({ message: 'Only users and sellers can create rentals' });
    }

    const { productId, startDate, endDate, totalAmount } = req.body;

    if (!productId || !startDate || !endDate || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await dbConnect();
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!canPlaceOrders(user.role)) {
      return res.status(403).json({ message: 'Only users and sellers can create rentals' });
    }

    if (!isProductPubliclyRentable(product)) {
      return res.status(400).json({ message: 'Product is not available for rent' });
    }

    if (String(product.seller) === String(user._id) && user.role === 'seller') {
      return res.status(403).json({ message: 'Sellers cannot rent their own listings' });
    }

    const securityDeposit = Number(product.securityDeposit) || 0;
    const rental = await Rental.create({
      product: productId,
      renter: user._id,
      seller: product.seller,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalAmount,
      paymentStatus: 'pending',
      rentalStatus: 'upcoming',
      securityDeposit,
      depositStatus: 'held',
    });

    createNotification({
      userId: product.seller,
      role: 'seller',
      message: 'New rental request received.',
      type: 'REQUEST',
      relatedId: rental._id,
    }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));

    return res.status(201).json({ message: 'Rental request created', rental });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function updateRental(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const body = req.body;
    const { rentalStatus, paymentStatus, returnedAt: bodyReturnedAt } = body;
    const { id } = req.params;

    await dbConnect();
    const rental = await Rental.findById(id).populate('product', 'pricePerDay');
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    if (rentalStatus && rental.seller.toString() !== user._id.toString() && !isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const update = { rentalStatus, paymentStatus };
    const oldRentalStatus = rental.rentalStatus;
    const oldPaymentStatus = rental.paymentStatus;
    const returnDate = bodyReturnedAt ? new Date(bodyReturnedAt) : rentalStatus === 'completed' ? new Date() : null;
    if (returnDate) {
      update.returnedAt = returnDate;
      const end = new Date(rental.endDate);
      if (returnDate > end) {
        const daysLate = Math.ceil((returnDate - end) / (1000 * 60 * 60 * 24));
        const productId = rental.product?._id ?? rental.product;
        const pricePerDay =
          rental.product?.pricePerDay ??
          (productId ? (await Product.findById(productId).select('pricePerDay').lean())?.pricePerDay : 0) ??
          0;
        update.latePenalty = Math.round(Math.max(0, daysLate * pricePerDay) * 100) / 100;
      }
      if (rentalStatus === 'completed') {
        update.depositStatus = update.latePenalty > 0 ? 'deducted' : 'released';
      }
    }

    const updatedRental = await Rental.findByIdAndUpdate(id, update, { new: true });

    if (oldRentalStatus !== updatedRental?.rentalStatus && updatedRental?.renter) {
      createNotification({
        userId: updatedRental.renter,
        role: 'renter',
        message: `Rental update: ${updatedRental.rentalStatus}.`,
        type: 'ORDER_UPDATE',
        relatedId: updatedRental._id,
      }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));
    }

    if (oldPaymentStatus !== updatedRental?.paymentStatus && updatedRental?.renter) {
      createNotification({
        userId: updatedRental.renter,
        role: 'renter',
        message: `Rental payment status: ${updatedRental.paymentStatus}.`,
        type: 'PAYMENT',
        relatedId: updatedRental._id,
      }).catch((err) => console.error('[notifications] createNotification failed:', err?.message || err));
    }

    return res.json({ message: 'Rental updated', rental: updatedRental });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function checkoutSingle(req, res) {
  try {
    if (!stripe) {
      return res.status(503).json({
        message: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env',
      });
    }

    const body = req.body;
    const rentalId = body?.rentalId;
    const totalAmount = typeof body?.totalAmount === 'number' ? body.totalAmount : parseFloat(body?.totalAmount);

    if (!rentalId || totalAmount == null || Number.isNaN(totalAmount)) {
      return res.status(400).json({ message: 'Missing or invalid rentalId or totalAmount' });
    }

    await dbConnect();
    const rental = await Rental.findById(rentalId).populate('product', 'title securityDeposit');
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }
    const deposit = Number(rental.securityDeposit) || Number(rental.product?.securityDeposit) || 0;
    const amountToCharge = totalAmount + deposit;
    const amountCents = Math.round(amountToCharge * 100);
    if (amountCents < 50) {
      return res.status(400).json({ message: 'Minimum charge is $0.50 (50 cents)' });
    }

    const baseUrl = appBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rental: ${rental.product?.title || 'Product Rental'}${deposit > 0 ? ` (incl. deposit $${deposit.toFixed(2)})` : ''}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        rentalId: rentalId.toString(),
      },
      success_url: `${baseUrl}/rentals/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/rentals/cancel`,
    });

    return res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error?.message || 'Checkout failed';
    return res.status(500).json({ message });
  }
}

export async function checkoutCart(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!canPlaceOrders(user.role)) {
      return res.status(403).json({ message: 'Only users and sellers can checkout' });
    }

    const body = req.body;
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty or invalid' });
    }

    const paymentMethod = ['cod', 'card', 'upi'].includes(body?.paymentMethod) ? body.paymentMethod : 'card';
    const fulfillmentType = ['delivery', 'pickup'].includes(body?.fulfillmentType) ? body.fulfillmentType : 'delivery';
    const selectedAddress = toAddressSnapshot(body?.selectedAddress);
    const damageProtectionFee = typeof body?.damageProtectionFee === 'number' ? Math.max(0, body.damageProtectionFee) : 0;

    if (paymentMethod === 'cod' && !stripe) {
      // COD doesn't need Stripe
    } else if (!stripe) {
      return res.status(503).json({ message: 'Stripe is not configured' });
    }

    await dbConnect();
    const lineItems = [];
    const rentalIds = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const product = await Product.findById(it.productId);
      if (!product) continue;
      if (!isProductPubliclyRentable(product)) continue;
      const totalAmount = typeof it.totalAmount === 'number' ? it.totalAmount : parseFloat(it.totalAmount);
      if (Number.isNaN(totalAmount) || totalAmount < 0.5) continue;

      if (String(product.seller) === String(user._id) && user.role === 'seller') {
        continue;
      }

      const securityDeposit = Number(product.securityDeposit) || 0;
      const isFirst = rentalIds.length === 0;
      const rentalDamageProtectionFee = isFirst ? damageProtectionFee : 0;

      const rental = await Rental.create({
        product: it.productId,
        renter: user._id,
        seller: product.seller,
        startDate: new Date(it.startDate),
        endDate: new Date(it.endDate),
        totalAmount,
        paymentStatus: paymentMethod === 'cod' ? 'paid' : 'pending',
        rentalStatus: 'upcoming',
        shippingAddress: selectedAddress,
        fulfillmentType,
        paymentMethod,
        securityDeposit,
        depositStatus: 'held',
        damageProtection: rentalDamageProtectionFee > 0,
        damageProtectionFee: rentalDamageProtectionFee,
      });
      rentalIds.push(rental._id.toString());

      const lineAmount = totalAmount + securityDeposit + rentalDamageProtectionFee;
      lineItems.push({
        name: `Rental: ${product.title}${securityDeposit > 0 ? ` (incl. deposit $${securityDeposit.toFixed(2)})` : ''}`,
        amount: Math.round(lineAmount * 100),
      });
    }

    if (rentalIds.length === 0) {
      return res.status(400).json({ message: 'No valid cart items' });
    }

    if (paymentMethod === 'cod') {
      return res.json({
        success: true,
        cod: true,
        rentalIds,
        message: 'Order placed. Cash on delivery.',
      });
    }

    const baseUrl = appBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems.map((li) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: li.name },
          unit_amount: Math.max(50, li.amount),
        },
        quantity: 1,
      })),
      metadata: { rentalIds: rentalIds.join(',') },
      success_url: `${baseUrl}/rentals/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/rentals/cancel`,
    });

    return res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout cart error:', error);
    return res.status(500).json({ message: error?.message || 'Checkout failed' });
  }
}

export async function rentalInvoice(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Rental id required' });

    await dbConnect();
    const rental = await Rental.findById(id)
      .populate('product', 'title pricePerDay')
      .populate('renter', 'name email')
      .populate('seller', 'name email')
      .lean();
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (
      String(rental.renter._id) !== String(user._id) &&
      String(rental.seller._id) !== String(user._id) &&
      !isAdminRole(user.role)
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const pdfkit = await import('pdfkit');
    const PDFDocument = pdfkit.default ?? pdfkit;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const finish = new Promise((resolve) => doc.on('end', resolve));

    doc.fontSize(20).text('Rental Agreement / Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Rental ID: ${rental._id}`, { align: 'left' });
    doc.text(`Date: ${new Date(rental.createdAt).toLocaleDateString()}`, { align: 'left' });
    doc.moveDown();

    doc.fontSize(12).text('Renter', { continued: false });
    doc.fontSize(10).text(`Name: ${rental.renter?.name || '—'}`);
    doc.text(`Email: ${rental.renter?.email || '—'}`);
    if (rental.shippingAddress && (rental.shippingAddress.street || rental.shippingAddress.city)) {
      doc.text(
        `Address: ${[rental.shippingAddress.street, rental.shippingAddress.city, rental.shippingAddress.state, rental.shippingAddress.pincode].filter(Boolean).join(', ')}`
      );
    }
    doc.moveDown();

    doc.fontSize(12).text('Seller', { continued: false });
    doc.fontSize(10).text(`Name: ${rental.seller?.name || '—'}`);
    doc.text(`Email: ${rental.seller?.email || '—'}`);
    doc.moveDown();

    doc.fontSize(12).text('Rental details', { continued: false });
    doc.fontSize(10).text(`Product: ${rental.product?.title || '—'}`);
    doc.text(`Start: ${new Date(rental.startDate).toLocaleDateString()} — End: ${new Date(rental.endDate).toLocaleDateString()}`);
    doc.text(`Fulfillment: ${rental.fulfillmentType === 'pickup' ? 'Self pickup' : 'Delivery'}`);
    doc.text(`Payment method: ${(rental.paymentMethod || 'card').toUpperCase()}`);
    doc.moveDown();

    doc.fontSize(12).text('Amounts', { continued: false });
    doc.fontSize(10).text(`Rental total: $${Number(rental.totalAmount).toFixed(2)}`);
    if (Number(rental.securityDeposit) > 0) doc.text(`Security deposit (refundable): $${Number(rental.securityDeposit).toFixed(2)}`);
    if (Number(rental.damageProtectionFee) > 0) doc.text(`Damage protection: $${Number(rental.damageProtectionFee).toFixed(2)}`);
    if (Number(rental.latePenalty) > 0) doc.text(`Late return penalty: $${Number(rental.latePenalty).toFixed(2)}`);
    doc.moveDown();

    doc
      .fontSize(9)
      .text(
        'Terms: Security deposit is refundable after return verification. Late returns may incur a per-day penalty. Damage protection may reduce deductions from the deposit.',
        { align: 'left' }
      );
    doc.end();
    await finish;

    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rental-invoice-${id}.pdf"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Invoice error:', err);
    return res.status(500).json({ message: err?.message || 'Failed to generate invoice' });
  }
}
