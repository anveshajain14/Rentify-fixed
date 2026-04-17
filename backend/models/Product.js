import mongoose, { Schema } from 'mongoose';

const ProductSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String, required: true }],
  category: { type: String, required: true },
  pricePerDay: { type: Number, required: true },
  pricePerWeek: { type: Number },
  pricePerMonth: { type: Number },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  availability: [{
    startDate: { type: Date },
    endDate: { type: Date }
  }],
  // Refundable security deposit (optional, per product)
  securityDeposit: { type: Number, default: 0 },
  // Seller can allow self-pickup
  allowPickup: { type: Boolean, default: false },
  // Cached ratings (from reviews)
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
