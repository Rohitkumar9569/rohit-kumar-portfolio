// File: server/src/models/Suggestion.ts

import { Schema, model, Document } from 'mongoose';

/**
 * @interface ISuggestion
 * Represents the structure of a single suggestion document.
 */
export interface ISuggestion extends Document {
  questionText: string;
  category: 'general_knowledge' | 'current_affairs' | 'pyq_upsc';
  suggestionDate: string; // Stored as 'YYYY-MM-DD' for easy querying
}

const SuggestionSchema = new Schema<ISuggestion>(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['general_knowledge', 'current_affairs', 'pyq_upsc'],
      required: true,
    },
    suggestionDate: {
      type: String, // e.g., "2025-10-03"
      required: true,
      index: true, // Index for faster date-based lookups
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// To prevent duplicate questions for the same day
SuggestionSchema.index({ questionText: 1, suggestionDate: 1 }, { unique: true });

const Suggestion = model<ISuggestion>('Suggestion', SuggestionSchema);

export default Suggestion;