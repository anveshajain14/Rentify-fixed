import mongoose, { Schema } from 'mongoose';

const ReplySchema = new Schema(
  {
    comment: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReviewSchema = new Schema(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    targetType: { type: String, enum: ['product', 'seller', 'renter'], required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, default: '', trim: true },
    // Optional reply for seller/shop context (kept for backwards compatibility)
    reply: { type: ReplySchema, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// One review per reviewer per order per target type
ReviewSchema.index({ reviewerId: 1, orderId: 1, targetType: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
