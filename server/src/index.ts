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
import authRoutes from './routes/auth';

// --- Environment Variable Check ---
// Ensures the server fails fast if the database URI is not provided.
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in the .env file.");
    process.exit(1);
}

const app: Express = express();
const port = process.env.PORT || 5000;

// --- Middleware ---

// Secure CORS Configuration for Production
const allowedOrigins = [
  'http://localhost:5173', // Your local frontend for development
  'https://your-live-website-domain.com' 
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/static', express.static('public'));

// --- Database Connection ---
const connectDB = async () => {
  try {
    // Connect using the validated MONGO_URI
    await mongoose.connect(MONGO_URI);
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
app.use('/api/auth', authRoutes);

// --- Server Initialization for Vercel ---

// The app.listen() block is commented out because Vercel handles the server listening.
/*
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
*/

// This line exports the Express app for Vercel's serverless environment.
export default app;