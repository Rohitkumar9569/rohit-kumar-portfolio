// File: server/src/middleware/multer.ts

import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Use memory storage to process files directly in RAM
const storage = multer.memoryStorage();

// Filter to allow only PDF files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /pdf/;
  const isPdf = allowedTypes.test(file.mimetype) && allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (isPdf) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed.'));
  }
};

// Initialize multer with memory storage and file filter
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB file size limit
  fileFilter,
});

export default upload;