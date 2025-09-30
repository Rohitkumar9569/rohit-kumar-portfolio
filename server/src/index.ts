// src/server/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import contactRoute from './routes/contact';
import pyqRoutes from './routes/pyqs';
import examRoutes from './routes/exams';
import subjectRoutes from './routes/subjects';
import authRoutes from './routes/auth';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined.");
    process.exit(1);
}

const app: Express = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://rohitkumar-portfolio.vercel.app' // आपका Vercel URL
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/static', express.static('public'));

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Successfully connected to MongoDB');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};
connectDB();

app.get('/', (req: Request, res: Response) => {
  res.send("API is running!");
});

app.use('/api/contact', contactRoute);
app.use('/api/pyqs', pyqRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/auth', authRoutes);

// ✅ NEW: Health check route for Uptime Robot
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).send('Server is awake and healthy!');
});

app.listen(port, () => {
  console.log(`[server]: Server is running on port ${port}`);
});