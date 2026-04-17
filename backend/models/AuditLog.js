import mongoose, { Schema } from 'mongoose';

const AuditLogSchema = new Schema({
  action: { type: String, required: true, enum: ['login', 'login_failed', 'login_locked', 'reset_request', 'reset_success', 'reset_failed', 'verify_otp', 'resend_otp'] },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  email: { type: String, default: null },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ email: 1, action: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
