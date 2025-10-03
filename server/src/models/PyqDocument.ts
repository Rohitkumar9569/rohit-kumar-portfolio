import { Schema, model, Document, Types } from 'mongoose';

/**
 * @interface ITextChunk
 * Represents a single piece of text with its corresponding vector embedding.
 */


/**
 * @interface IPyqDocument
 * Represents the structure of a PYQ document in the database.
 */
export interface IPyqDocument extends Document {
  title: string;
  year: number;
  fileUrl: string; // URL from Cloudinary
  cloudinaryPublicId: string; // ID for deleting the file from Cloudinary
  examId: Types.ObjectId; // Reference to the Exam model
  subjectId: Types.ObjectId; // Reference to the Subject model
  uploader: Types.ObjectId;
  tags?: string[];
}


const PyqDocumentSchema = new Schema<IPyqDocument>(
  {
    title: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    fileUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    // Replaced string fields with direct references
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

const PyqDocument = model<IPyqDocument>('PyqDocument', PyqDocumentSchema);

export default PyqDocument;