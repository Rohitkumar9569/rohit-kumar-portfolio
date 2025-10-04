// File: src/server/index.ts

import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cron from 'node-cron';

// Import the function directly instead of using exec.
import { generateDailyJourney } from './scripts/generateDailyJourney'; 

import contactRoute from './routes/contact';
import pyqRoutes from './routes/pyqs';
import examRoutes from './routes/exams';
import subjectRoutes from './routes/subjects';
import authRoutes from './routes/auth';
import suggestionRoutes from './routes/suggestions';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined.");
    process.exit(1);
}

const app: Express = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://rohitkumar-portfolio.vercel.app'
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
app.use('/api/suggestions', suggestionRoutes); 

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).send('Server is awake and healthy!');
});


// --- UPDATED AND RELIABLE CRON JOB SETUP ---
cron.schedule('0 5 * * *', async () => {
  console.log('⏰ Running daily suggestion generator cron job...');
  try {
    // Call the imported function directly. This is much safer.
    await generateDailyJourney();
    console.log('✅ Cron job finished successfully.');
  } catch (error) {
    console.error('❌ Cron job failed:', error);
  }
}, {
  timezone: "Asia/Kolkata"
});
// --- END CRON JOB SETUP ---


app.listen(port, () => {
  console.log(`[server]: Server is running on port ${port}`);
});