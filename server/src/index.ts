import dotenv from 'dotenv';
dotenv.config(); // <-- MUST BE THE FIRST LINE

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

// --- Route Imports ---
import contactRoute from './routes/contact';
import pyqRoutes from './routes/pyqs';
import examRoutes from './routes/exams';
import subjectRoutes from './routes/subjects';
import authRoutes from './routes/auth'; // 1. Import the new auth routes

const app: Express = express();
const port = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use('/static', express.static('public'));

// --- Database Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ Successfully connected to MongoDB');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

connectDB();

// --- API Routes ---
app.get('/', (req: Request, res: Response) => {
  res.send("The Digital Architect's Blueprint API is running!");
});

app.use('/api/contact', contactRoute);
app.use('/api/pyqs', pyqRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/auth', authRoutes); // 2. Use the new auth routes

// --- Server Initialization ---
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});