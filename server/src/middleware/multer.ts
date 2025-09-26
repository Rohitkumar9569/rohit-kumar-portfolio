import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configure multer disk storage engine
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Files will be saved in the 'public/uploads' directory
    cb(null, 'public/uploads/');
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Generate a unique filename to prevent overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File type validation filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /pdf/; // Allow only PDF files for now
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  
  cb(new Error('File type not allowed. Only PDF files are accepted.'));
};

// Initialize multer with the defined storage, limits, and file filter
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Set file size limit to 15MB
  fileFilter,
});

export default upload;