import { Types } from 'mongoose';

export const cleanString = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

export const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isValidObjectId = (value: unknown): value is string => {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
};

export const isValidSlug = (value: string) => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
};
