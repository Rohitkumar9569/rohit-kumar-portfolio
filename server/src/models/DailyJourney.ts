import mongoose, { Document, Schema } from 'mongoose';

/**
 * Defines the structure for a single question pair.
 * This is a sub-document within the DailyJourney.
 */
const QuestionPairSchema: Schema = new Schema({
  ca_question: {
    type: String,
    default: null,
  },
  related_pyq: {
    type: String,
    default: null,
  },
  pyq_verified: {
    type: Boolean,
    default: false,
  },
  pyq_source_url: {
    type: String,
    default: null,
  },
});

/**
 * Defines the main schema for the daily journey document.
 */
const DailyJourneySchema: Schema = new Schema(
  {
    journeyDate: {
      type: String,
      required: true,
      unique: true,
      index: true, // Improves query performance for finding dates
    },
    questions: [QuestionPairSchema],
    meta: {
      generatedAt: {
        type: String,
      },
      sourceFetchCount: {
        type: Number,
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// --- TypeScript Interfaces for Type Safety ---

export interface IQuestionPair extends Document {
  ca_question: string | null;
  related_pyq: string | null;
  pyq_verified?: boolean;
  pyq_source_url?: string | null;
}

export interface IDailyJourney extends Document {
  journeyDate: string;
  questions: IQuestionPair[];
  meta?: {
    generatedAt: string;
    sourceFetchCount: number;
  };
}

export default mongoose.model<IDailyJourney>('DailyJourney', DailyJourneySchema);