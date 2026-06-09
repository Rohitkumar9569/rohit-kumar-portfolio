import { Schema, model, Document, Types } from 'mongoose';

export interface IInterviewProfile {
  homeState?: string;
  graduationStream?: string;
  hobbies: string[];
}

export interface IUserPreference extends Document {
  userId: Types.ObjectId;
  selectedWorkspaceIds: Types.ObjectId[];
  activeWorkspaceId?: Types.ObjectId;
  activePhase?: string;
  language: 'hinglish' | 'english' | 'hindi' | 'mixed';
  selectedSubjects: string[];
  preferredResourceTypes: string[];
  onboardingCompleted: boolean;
  interviewProfile: IInterviewProfile;
}

const InterviewProfileSchema = new Schema<IInterviewProfile>(
  {
    homeState: { type: String, trim: true, maxlength: 80 },
    graduationStream: { type: String, trim: true, maxlength: 120 },
    hobbies: { type: [String], default: [] },
  },
  { _id: false }
);

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    selectedWorkspaceIds: [{ type: Schema.Types.ObjectId, ref: 'Workspace', index: true }],
    activeWorkspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },
    activePhase: { type: String, trim: true, lowercase: true, maxlength: 50 },
    language: { type: String, enum: ['hinglish', 'english', 'hindi', 'mixed'], default: 'hinglish' },
    selectedSubjects: { type: [String], default: [] },
    preferredResourceTypes: { type: [String], default: [] },
    onboardingCompleted: { type: Boolean, default: false },
    interviewProfile: { type: InterviewProfileSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const UserPreference = model<IUserPreference>('UserPreference', UserPreferenceSchema);

export default UserPreference;
