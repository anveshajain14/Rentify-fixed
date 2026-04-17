import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional for Google OAuth users
  // Google OAuth
  googleId: { type: String, sparse: true, unique: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  role: { type: String, enum: ['user', 'seller', 'admin'], default: 'user' },
  previousRole: { type: String, enum: ['user', 'seller'], default: 'user' },
  avatar: { type: String, default: '' },
  shopBanner: { type: String, default: '' },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  policies: { type: String, default: '' },
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  joinedAt: { type: Date, default: Date.now },
  isBlocked: { type: Boolean, default: false },
  // Email verification
  isVerified: { type: Boolean, default: false },
  emailVerificationOTP: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  otpResendCount: { type: Number, default: 0 },
  otpResendWindow: { type: Date, default: null },
  // Password reset
  passwordResetToken: { type: String, default: null },
  passwordResetExpiry: { type: Date, default: null },
  // Login 2FA (optional)
  loginOTP: { type: String, default: null },
  loginOTPExpiry: { type: Date, default: null },
  // Account lock after failed attempts
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  // Invalidate all sessions on password reset
  sessionVersion: { type: Number, default: 0 },
  // Saved addresses for checkout (per user)
  addresses: [{
    fullName: { type: String },
    name: { type: String },
    phone: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    isDefault: { type: Boolean, default: false },
  }],

  // Cached ratings (from reviews)
  sellerAverageRating: { type: Number, default: 0 },
  sellerTotalReviews: { type: Number, default: 0 },
  renterAverageRating: { type: Number, default: 0 },
  renterTotalReviews: { type: Number, default: 0 },
}, { timestamps: true });

// Must have at least one auth method
UserSchema.pre('save', async function () {
  if (!this.password && !this.googleId) {
    throw new Error('User must have either password or googleId');
  }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
