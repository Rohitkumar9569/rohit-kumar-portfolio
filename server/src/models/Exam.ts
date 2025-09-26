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
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Exam = model<IExam>('Exam', ExamSchema);

export default Exam;