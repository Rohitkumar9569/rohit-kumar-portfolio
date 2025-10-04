// File: server/src/models/DailyJourney.ts
import { Schema, model, Document } from 'mongoose';

// Defines the structure for a pair of questions.
interface IQuestionPair {
  ca_question: string;
  related_pyq: string;
}

// Defines the structure for the entire day's journey.
export interface IDailyJourney extends Document {
  journeyDate: string; // Stored as DD MMM YYYY
  questions: IQuestionPair[];
}

const QuestionPairSchema = new Schema<IQuestionPair>({
  ca_question: { type: String, required: true },
  related_pyq: { type: String, required: true },
}, { _id: false });

const DailyJourneySchema = new Schema<IDailyJourney>({
  journeyDate: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  questions: [QuestionPairSchema],
}, { timestamps: true });

const DailyJourney = model<IDailyJourney>('DailyJourney', DailyJourneySchema);

export default DailyJourney;