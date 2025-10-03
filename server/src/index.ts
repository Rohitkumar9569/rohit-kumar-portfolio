// File: src/server/index.ts

import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cron from 'node-cron'; // <-- Import node-cron
import { exec } from 'child_process'; // <-- Import exec for running scripts
import path from 'path'; // <-- Import path for resolving file paths

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


// --- CRON JOB SETUP ---
// This will run the script every day at 1:00 AM India Standard Time.
cron.schedule('0 1 * * *', () => {
  console.log('⏰ Running daily suggestion generator cron job...');
  
  // Resolve the path to the script relative to the compiled JS output directory
  const scriptPath = path.resolve(__dirname, 'scripts', 'generateDailySuggestions.js');
  
  // NOTE: In production, you run the compiled .js file, not the .ts file.
  // We use `node` to execute it. For development with ts-node, you'd use `ts-node`.
  const command = process.env.NODE_ENV === 'production' 
    ? `node ${scriptPath}` 
    : `ts-node ${path.resolve(__dirname, 'scripts', 'generateDailySuggestions.ts')}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Cron Job Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`❌ Cron Job Stderr: ${stderr}`);
      return;
    }
    console.log(`✅ Cron Job Output: ${stdout}`);
  });
}, {
  timezone: "Asia/Kolkata"
});
// --- END CRON JOB SETUP ---


app.listen(port, () => {
  console.log(`[server]: Server is running on port ${port}`);
});