import mongoose, { Schema } from 'mongoose';

const addressSnapshotSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const OrderRequestSchema = new Schema(
  {
    renterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    days: { type: Number, required: true, min: 1 },
    deliveryType: { type: String, enum: ['selfPickup', 'delivery'], required: true },
    address: { type: addressSnapshotSchema, required: true },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    cautionMoney: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.OrderRequest || mongoose.model('OrderRequest', OrderRequestSchema);
