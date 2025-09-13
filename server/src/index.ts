// server/src/index.ts

import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import contactRoute from './routes/contact';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.get('/', (req: Request, res: Response) => {
  res.send('The Digital Architect\'s Blueprint API is running!');
});

app.use('/api/contact', contactRoute);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});