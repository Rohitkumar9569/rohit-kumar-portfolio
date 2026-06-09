import { Schema, model, Document, Types } from 'mongoose';

export interface IStudyIconAsset extends Document {
  key: string;
  label: string;
  url: string;
  publicId?: string;
  resourceType?: string;
  createdBy?: Types.ObjectId;
}

const StudyIconAssetSchema = new Schema<IStudyIconAsset>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 900 },
    publicId: { type: String, trim: true, maxlength: 220 },
    resourceType: { type: String, trim: true, maxlength: 40 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

StudyIconAssetSchema.index({ label: 1 });

const StudyIconAsset = model<IStudyIconAsset>('StudyIconAsset', StudyIconAssetSchema);

export default StudyIconAsset;
