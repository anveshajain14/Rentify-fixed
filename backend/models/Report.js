import mongoose, { Schema } from 'mongoose';

const ReportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.Report || mongoose.model('Report', ReportSchema);

