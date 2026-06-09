import { Schema, model, Document, Types } from 'mongoose';

export interface IResourceRequest extends Document {
  title: string;
  workspaceId?: Types.ObjectId;
  resourceType?: string;
  subject?: string;
  message?: string;
  sourceUrl?: string;
  requester?: Types.ObjectId;
  status: 'open' | 'planned' | 'fulfilled' | 'rejected';
  voteCount: number;
}

const ResourceRequestSchema = new Schema<IResourceRequest>(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    resourceType: { type: String, trim: true, maxlength: 50, index: true },
    subject: { type: String, trim: true, maxlength: 120, index: true },
    message: { type: String, trim: true, maxlength: 1000 },
    sourceUrl: { type: String, trim: true, maxlength: 900 },
    requester: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['open', 'planned', 'fulfilled', 'rejected'], default: 'open', index: true },
    voteCount: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true }
);

ResourceRequestSchema.index({ workspaceId: 1, status: 1, voteCount: -1 });

const ResourceRequest = model<IResourceRequest>('ResourceRequest', ResourceRequestSchema);

export default ResourceRequest;
