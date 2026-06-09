// File: server/src/models/User.ts
import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export const adminPermissionKeys = [
  'library:view',
  'library:create',
  'library:update',
  'library:upload',
  'library:publish',
  'library:unpublish',
  'library:delete',
  'kits:manage',
  'review:manage',
  'users:manage',
] as const;

export type AdminPermissionKey = typeof adminPermissionKeys[number];

export interface IAdminScope {
  enabled: boolean;
  rootCardIds: Types.ObjectId[];
  permissions: AdminPermissionKey[];
  examSlugs: string[];
  updatedAt?: Date;
}

// Interface for the User document
export interface IUser extends Document {
  email: string;
  password?: string; // Password is optional on the document after creation
  role: 'admin' | 'user';
  name?: string;
  avatarUrl?: string;
  googleId?: string;
  authProvider: 'password' | 'google';
  adminScope?: IAdminScope;
  comparePassword(password: string): Promise<boolean>;
}

const AdminScopeSchema = new Schema<IAdminScope>({
  enabled: {
    type: Boolean,
    default: false,
  },
  rootCardIds: [{
    type: Schema.Types.ObjectId,
    ref: 'StudyCard',
    index: true,
  }],
  permissions: [{
    type: String,
    enum: adminPermissionKeys,
  }],
  examSlugs: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  updatedAt: {
    type: Date,
  },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  password: {
    type: String,
    required(this: IUser) {
      return !this.googleId;
    },
    minlength: 8,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
    required: true,
  },
  name: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  avatarUrl: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  googleId: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
  },
  authProvider: {
    type: String,
    enum: ['password', 'google'],
    default: 'password',
    required: true,
  },
  adminScope: {
    type: AdminScopeSchema,
    default: () => ({
      enabled: false,
      rootCardIds: [],
      permissions: [],
      examSlugs: [],
    }),
  },
}, { timestamps: true });

// --- Password Hashing Middleware ---
// This function runs automatically BEFORE a user document is saved.
UserSchema.pre<IUser>('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// --- Password Comparison Method ---
// This method is used during login to compare the submitted password with the stored hash.
UserSchema.methods.comparePassword = function (password: string): Promise<boolean> {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(password, this.password);
};

const User = model<IUser>('User', UserSchema);

export default User;
