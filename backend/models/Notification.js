import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['admin', 'seller', 'renter'], required: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['REQUEST', 'APPROVAL', 'ORDER_UPDATE', 'PAYMENT', 'SYSTEM'],
      required: true,
    },
    relatedId: { type: Schema.Types.ObjectId, required: false },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

