import mongoose, { Schema } from 'mongoose';

const OrderSchema = new Schema(
  {
    orderRequestId: { type: Schema.Types.ObjectId, ref: 'OrderRequest', required: true, unique: true, index: true },
    renterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, enum: ['cod', 'online'], default: 'cod' },
    paymentStatus: { type: String, enum: ['pending', 'done'], default: 'pending' },
    status: {
      type: String,
      enum: ['orderPlaced', 'paymentDone', 'deliveryDone', 'returnDone', 'refundDone', 'completed'],
      default: 'orderPlaced',
    },
    cautionMoney: { type: Number, default: 0, min: 0 },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    depositStatus: {
      type: String,
      enum: ['held', 'refunded', 'partially_refunded', 'forfeited'],
      default: 'held',
    },
    depositRefundId: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
