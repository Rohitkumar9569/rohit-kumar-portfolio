// File: server/src/types.d.ts

// Provides type definitions for modules that don't include their own.
declare module 'pdf-poppler';
declare module 'cosine-similarity-search';

// Describes the structure of a single text chunk and its vector embedding.
export interface IChunk {
  text: string;
  vector: number[];
}

// Describes the structure for a complete PYQ document.
export interface IPyqDocument {
  id: string;
  title: string;
  exam: string;
  subject: string;
  year: number;
  chunks: IChunk[];
}