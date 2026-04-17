import mongoose, { Schema } from 'mongoose';

const addressSnapshotSchema = new Schema({
  name: String,
  phone: String,
  street: String,
  city: String,
  state: String,
  pincode: String,
}, { _id: false });

const RentalSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  renter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  rentalStatus: { type: String, enum: ['upcoming', 'active', 'completed', 'cancelled'], default: 'upcoming' },
  stripeSessionId: { type: String },
  // Address & fulfillment
  shippingAddress: { type: addressSnapshotSchema },
  fulfillmentType: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
  // Payment method used
  paymentMethod: { type: String, enum: ['card', 'upi', 'cod'], default: 'card' },
  // Security deposit (refundable)
  securityDeposit: { type: Number, default: 0 },
  depositStatus: { type: String, enum: ['held', 'released', 'deducted'], default: 'held' },
  // Optional damage protection add-on
  damageProtection: { type: Boolean, default: false },
  damageProtectionFee: { type: Number, default: 0 },
  // Late return penalty (calculated after return)
  latePenalty: { type: Number, default: 0 },
  returnedAt: { type: Date },
}, { timestamps: true });

export default mongoose.models.Rental || mongoose.model('Rental', RentalSchema);
