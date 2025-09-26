// server/src/types.ts

export interface IChunk {
  text: string;
  vector: number[];
}

export interface IPyqDocument {
  id: string; // The original filename or a unique ID
  title: string;
  exam: string;
  subject: string;
  year: number;
  chunks: IChunk[];
}