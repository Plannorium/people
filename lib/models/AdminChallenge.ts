import mongoose, { Schema, type Model } from "mongoose";
interface Challenge { _id: string; nonceHash: string; codeHash: string; expiresAt: Date; nextSendAt: Date; attempts: number; }
const schema = new Schema<Challenge>({
  _id: { type: String, required: true },
  nonceHash: { type: String, required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  nextSendAt: { type: Date, required: true },
  attempts: { type: Number, required: true, default: 0 },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AdminChallenge = (mongoose.models.AdminChallenge as Model<Challenge> | undefined) || mongoose.model<Challenge>("AdminChallenge", schema);
