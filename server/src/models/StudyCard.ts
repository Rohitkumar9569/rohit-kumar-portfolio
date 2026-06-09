import { Schema, model, Document, Types } from 'mongoose';

export const studyCardStatuses = ['published', 'draft', 'archived'] as const;
export const studyCardVisibilities = ['public', 'private', 'invite_only'] as const;
export const studyCardTones = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'indigo', 'slate'] as const;
export const studyCardGoalTypes = [
  'library_root',
  'exam_category',
  'exam_family',
  'exam',
  'board',
  'class',
  'subject',
  'resource_folder',
] as const;

export type StudyCardStatus = typeof studyCardStatuses[number];
export type StudyCardVisibility = typeof studyCardVisibilities[number];
export type StudyCardTone = typeof studyCardTones[number];
export type StudyCardGoalType = typeof studyCardGoalTypes[number];

export interface IStudyCardFile {
  name: string;
  url: string;
  thumbnailUrl?: string;
  sizeBytes?: number;
  mimeType?: string;
  publicId?: string;
  resourceType?: string;
  status?: StudyCardStatus;
  visibility?: StudyCardVisibility;
  year?: number;
  stage?: string;
  paper?: string;
  subject?: string;
  topic?: string;
  language?: 'hinglish' | 'english' | 'hindi' | 'mixed';
  sourceType?: 'official' | 'ncert' | 'standard_book' | 'faculty' | 'creator' | 'community' | 'platform';
  sourceName?: string;
  notes?: string;
  uploadedAt: Date;
}

export interface IStudyCard extends Document {
  workspaceId: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  name: string;
  slug: string;
  iconKey: string;
  iconUrl?: string;
  goalType?: StudyCardGoalType;
  tone: StudyCardTone;
  order: number;
  status: StudyCardStatus;
  visibility: StudyCardVisibility;
  files: IStudyCardFile[];
  createdBy?: Types.ObjectId;
}

const StudyCardFileSchema = new Schema<IStudyCardFile>(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    url: { type: String, required: true, trim: true, maxlength: 900 },
    thumbnailUrl: { type: String, trim: true, maxlength: 900 },
    sizeBytes: { type: Number, min: 0 },
    mimeType: { type: String, trim: true, maxlength: 120 },
    publicId: { type: String, trim: true, maxlength: 220 },
    resourceType: { type: String, trim: true, maxlength: 40 },
    status: { type: String, enum: studyCardStatuses, default: 'draft', index: true },
    visibility: { type: String, enum: studyCardVisibilities, default: 'public', index: true },
    year: { type: Number, min: 1900, max: 2100, index: true },
    stage: { type: String, trim: true, maxlength: 80, index: true },
    paper: { type: String, trim: true, maxlength: 100, index: true },
    subject: { type: String, trim: true, maxlength: 120, index: true },
    topic: { type: String, trim: true, maxlength: 140, index: true },
    language: { type: String, enum: ['hinglish', 'english', 'hindi', 'mixed'], default: 'hinglish', index: true },
    sourceType: {
      type: String,
      enum: ['official', 'ncert', 'standard_book', 'faculty', 'creator', 'community', 'platform'],
      default: 'platform',
      index: true,
    },
    sourceName: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 600 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const StudyCardSchema = new Schema<IStudyCard>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'StudyCard', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 90,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    iconKey: { type: String, default: 'folder', trim: true, lowercase: true, maxlength: 50 },
    iconUrl: { type: String, trim: true, maxlength: 900 },
    goalType: { type: String, enum: studyCardGoalTypes, default: 'resource_folder', index: true },
    tone: { type: String, enum: studyCardTones, default: 'blue', index: true },
    order: { type: Number, default: 0, min: 0, index: true },
    status: { type: String, enum: studyCardStatuses, default: 'published', index: true },
    visibility: { type: String, enum: studyCardVisibilities, default: 'public', index: true },
    files: { type: [StudyCardFileSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

StudyCardSchema.index({ workspaceId: 1, parentId: 1, slug: 1 }, { unique: true });
StudyCardSchema.index({ workspaceId: 1, parentId: 1, order: 1, name: 1 });
StudyCardSchema.index({ workspaceId: 1, goalType: 1, status: 1 });
StudyCardSchema.index({ name: 'text', slug: 'text' });

const StudyCard = model<IStudyCard>('StudyCard', StudyCardSchema);

export default StudyCard;
