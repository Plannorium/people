import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettings extends Document {
  reviewIntervalMonths: number;
  retentionPeriodYears: number;
  allowedEmailDomain: string;
  hrEmail: string;
  updatedBy?: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    reviewIntervalMonths: { type: Number, default: 6, required: true },
    retentionPeriodYears: { type: Number, default: 2, required: true },
    allowedEmailDomain: { type: String, default: "plannorium.com", required: true },
    hrEmail: { type: String, default: "hr@plannorium.com", required: true },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);
