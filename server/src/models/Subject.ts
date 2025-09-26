import { Schema, model, Document, Types } from 'mongoose';

/**
 * @interface ISubject
 * Represents a subject or paper within an exam.
 */
export interface ISubject extends Document {
  name: string; // e.g., "Computer Science", "GS Paper I"
  examId: Types.ObjectId; // Reference to the parent Exam
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Creates a link to the Exam collection
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Subject = model<ISubject>('Subject', SubjectSchema);

export default Subject;