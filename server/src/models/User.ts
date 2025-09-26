// File: server/src/models/User.ts
import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

// Interface for the User document
export interface IUser extends Document {
  email: string;
  password?: string; // Password is optional on the document after creation
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
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
  return bcrypt.compare(password, this.password);
};

const User = model<IUser>('User', UserSchema);

export default User;