import { Schema, model, Document, Types } from 'mongoose';

export const resourceTypes = [
  'pyq',
  'notes',
  'material',
  'book',
  'syllabus',
  'qa',
  'practice',
  'update',
  'assignment',
] as const;

export const resourceStatuses = ['published', 'draft', 'pending', 'archived'] as const;
export const resourceLanguages = ['hinglish', 'english', 'hindi', 'mixed'] as const;
export const sourceTypes = [
  'official',
  'ncert',
  'standard_book',
  'faculty',
  'creator',
  'community',
  'platform',
] as const;

export type ResourceType = typeof resourceTypes[number];
export type ResourceStatus = typeof resourceStatuses[number];
export type ResourceLanguage = typeof resourceLanguages[number];
export type SourceType = typeof sourceTypes[number];

export interface IResourceLink {
  label: string;
  url: string;
}

export interface IResourceStats {
  views: number;
  saves: number;
  downloads: number;
}

export interface IResource extends Document {
  title: string;
  slug: string;
  summary?: string;
  type: ResourceType;
  status: ResourceStatus;
  visibility: 'public' | 'private' | 'invite_only';
  primaryWorkspaceId?: Types.ObjectId;
  workspaceIds: Types.ObjectId[];
  subject?: string;
  topic?: string;
  year?: number;
  language: ResourceLanguage;
  sourceType: SourceType;
  sourceName?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  facets: Record<string, unknown>;
  syllabusNodes: string[];
  fileUrl?: string;
  content?: string;
  externalLinks: IResourceLink[];
  isFeatured: boolean;
  updatedFor?: string;
  stats: IResourceStats;
  uploader?: Types.ObjectId;
}

const ResourceLinkSchema = new Schema<IResourceLink>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 700 },
  },
  { _id: false }
);

const ResourceStatsSchema = new Schema<IResourceStats>(
  {
    views: { type: Number, default: 0, min: 0 },
    saves: { type: Number, default: 0, min: 0 },
    downloads: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const ResourceSchema = new Schema<IResource>(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      lowercase: true,
      maxlength: 120,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    summary: { type: String, trim: true, maxlength: 900 },
    type: { type: String, required: true, enum: resourceTypes, index: true },
    status: { type: String, enum: resourceStatuses, default: 'draft', index: true },
    visibility: { type: String, enum: ['public', 'private', 'invite_only'], default: 'public', index: true },
    primaryWorkspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    workspaceIds: [{ type: Schema.Types.ObjectId, ref: 'Workspace', index: true }],
    subject: { type: String, trim: true, maxlength: 100, index: true },
    topic: { type: String, trim: true, maxlength: 140, index: true },
    year: { type: Number, min: 1900, max: 2100, index: true },
    language: { type: String, enum: resourceLanguages, default: 'hinglish', index: true },
    sourceType: { type: String, enum: sourceTypes, default: 'platform', index: true },
    sourceName: { type: String, trim: true, maxlength: 120 },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], index: true },
    tags: { type: [String], default: [], index: true },
    facets: { type: Schema.Types.Mixed, default: {} },
    syllabusNodes: { type: [String], default: [], index: true },
    fileUrl: { type: String, trim: true, maxlength: 700 },
    content: { type: String, trim: true, maxlength: 30000 },
    externalLinks: { type: [ResourceLinkSchema], default: [] },
    isFeatured: { type: Boolean, default: false, index: true },
    updatedFor: { type: String, trim: true, maxlength: 80, index: true },
    stats: { type: ResourceStatsSchema, default: () => ({}) },
    uploader: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

ResourceSchema.index({ workspaceIds: 1, status: 1, type: 1, year: -1 });
ResourceSchema.index({ primaryWorkspaceId: 1, type: 1, subject: 1, year: -1 });
ResourceSchema.index({
  title: 'text',
  summary: 'text',
  subject: 'text',
  topic: 'text',
  tags: 'text',
  syllabusNodes: 'text',
}, {
  name: 'resource_search_text',
  default_language: 'none',
  language_override: 'textLanguage',
});

const Resource = model<IResource>('Resource', ResourceSchema);

export default Resource;
