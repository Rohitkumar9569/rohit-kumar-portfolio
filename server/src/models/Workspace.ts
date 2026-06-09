import { Schema, model, Document, Types } from 'mongoose';

export const workspaceTypes = ['exam', 'school', 'college', 'placement', 'personal'] as const;
export const workspaceStatuses = ['active', 'coming_soon', 'info_only', 'archive'] as const;
export const workspaceVisibilities = ['public', 'private', 'invite_only'] as const;

export type WorkspaceType = typeof workspaceTypes[number];
export type WorkspaceStatus = typeof workspaceStatuses[number];
export type WorkspaceVisibility = typeof workspaceVisibilities[number];

export interface IWorkspacePhase {
  key: string;
  label: string;
  order: number;
}

export interface IWorkspaceFacet {
  key: string;
  label: string;
  values: string[];
}

export interface IWorkspaceTemplate {
  phases: IWorkspacePhase[];
  facets: IWorkspaceFacet[];
  resourceTypes: string[];
}

export interface IWorkspace extends Document {
  name: string;
  shortName?: string;
  slug: string;
  type: WorkspaceType;
  category?: string;
  description?: string;
  visibility: WorkspaceVisibility;
  status: WorkspaceStatus;
  owner?: Types.ObjectId;
  accentColor?: string;
  priority: number;
  readiness: number;
  template: IWorkspaceTemplate;
}

const WorkspacePhaseSchema = new Schema<IWorkspacePhase>(
  {
    key: { type: String, required: true, trim: true, lowercase: true, maxlength: 50 },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    order: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const WorkspaceFacetSchema = new Schema<IWorkspaceFacet>(
  {
    key: { type: String, required: true, trim: true, lowercase: true, maxlength: 50 },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    values: { type: [String], default: [] },
  },
  { _id: false }
);

const WorkspaceTemplateSchema = new Schema<IWorkspaceTemplate>(
  {
    phases: { type: [WorkspacePhaseSchema], default: [] },
    facets: { type: [WorkspaceFacetSchema], default: [] },
    resourceTypes: { type: [String], default: [] },
  },
  { _id: false }
);

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    shortName: { type: String, trim: true, maxlength: 40 },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      lowercase: true,
      maxlength: 90,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    type: { type: String, required: true, enum: workspaceTypes, index: true },
    category: { type: String, trim: true, lowercase: true, maxlength: 60, index: true },
    description: { type: String, trim: true, maxlength: 700 },
    visibility: { type: String, enum: workspaceVisibilities, default: 'public', index: true },
    status: { type: String, enum: workspaceStatuses, default: 'coming_soon', index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    accentColor: { type: String, trim: true, maxlength: 30 },
    priority: { type: Number, default: 0, min: 0, index: true },
    readiness: { type: Number, default: 0, min: 0, max: 100 },
    template: { type: WorkspaceTemplateSchema, default: () => ({}) },
  },
  { timestamps: true }
);

WorkspaceSchema.index({ type: 1, status: 1, priority: -1, name: 1 });
WorkspaceSchema.index({ name: 'text', shortName: 'text', description: 'text' });

const Workspace = model<IWorkspace>('Workspace', WorkspaceSchema);

export default Workspace;
