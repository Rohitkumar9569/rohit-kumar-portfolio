import { Schema, model, Document, Types } from 'mongoose';

export interface IReadingProgress {
  page?: number;
  percent?: number;
  updatedAt?: Date;
}

export interface IOfflineState {
  available: boolean;
  cachedAt?: Date;
  sizeBytes?: number;
}

export interface ISavedResource extends Document {
  userId: Types.ObjectId;
  resourceId: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  status: 'saved' | 'downloaded' | 'bookmarked' | 'completed';
  notes?: string;
  progress: IReadingProgress;
  offline: IOfflineState;
}

const ReadingProgressSchema = new Schema<IReadingProgress>(
  {
    page: { type: Number, min: 1 },
    percent: { type: Number, min: 0, max: 100 },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const OfflineStateSchema = new Schema<IOfflineState>(
  {
    available: { type: Boolean, default: false },
    cachedAt: { type: Date },
    sizeBytes: { type: Number, min: 0 },
  },
  { _id: false }
);

const SavedResourceSchema = new Schema<ISavedResource>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resourceId: { type: Schema.Types.ObjectId, ref: 'Resource', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    status: {
      type: String,
      enum: ['saved', 'downloaded', 'bookmarked', 'completed'],
      default: 'saved',
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    progress: { type: ReadingProgressSchema, default: () => ({}) },
    offline: { type: OfflineStateSchema, default: () => ({ available: false }) },
  },
  { timestamps: true }
);

SavedResourceSchema.index({ userId: 1, resourceId: 1 }, { unique: true });
SavedResourceSchema.index({ userId: 1, updatedAt: -1 });

const SavedResource = model<ISavedResource>('SavedResource', SavedResourceSchema);

export default SavedResource;
