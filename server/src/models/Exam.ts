import { Schema, model, Document } from 'mongoose';

/**
 * @interface IExam
 * Represents an examination category (e.g., GATE, UPSC).
 */
export interface IExam extends Document {
  name: string; // Full name: "Graduate Aptitude Test in Engineering"
  shortName: string; // Abbreviation: "GATE"
  slug: string; // URL-friendly identifier: "gate"
}

const ExamSchema = new Schema<IExam>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
      maxlength: 30,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
  },
  { timestamps: true }
);

const Exam = model<IExam>('Exam', ExamSchema);

export default Exam;
