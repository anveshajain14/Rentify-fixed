import mongoose, { Schema } from 'mongoose';

const ConversationSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    renterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ConversationSchema.index({ sellerId: 1, renterId: 1 }, { unique: true });

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
