// File: server/src/index.ts

import dotenv from 'dotenv';
dotenv.config();

import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import contactRoute from './routes/contact';
import pyqRoutes from './routes/pyqs';
import examRoutes from './routes/exams';
import subjectRoutes from './routes/subjects';
import authRoutes from './routes/auth';
import suggestionRoutes from './routes/suggestions';
import studyRoutes from './routes/study';
import { apiLimiter, securityHeaders } from './middleware/security';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined.");
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

const app: Express = express();
const port = process.env.PORT || 5001;
const startedAt = new Date();
const serviceName = 'MyBlueprintPortfolio API';

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:4173',
  'https://rohitkumar-portfolio.vercel.app'
];

const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : defaultAllowedOrigins;

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);
app.use('/static', express.static('public', { index: false, maxAge: '1d' }));

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[db] Connected to MongoDB');
  } catch (error) {
    console.error('[db] Error connecting to MongoDB:', error);
    process.exit(1);
  }
};
connectDB();

app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: serviceName,
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: startedAt.toISOString(),
  });
});

app.use('/api/contact', contactRoute);
app.use('/api/pyqs', pyqRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/study', studyRoutes);

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    service: serviceName,
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ message: 'API route not found.' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.name === 'SyntaxError') {
    return res.status(400).json({ message: 'Invalid JSON payload.' });
  }

  if (err.name === 'MulterError' || err.message === 'Only PDF files are allowed.') {
    return res.status(400).json({ message: err.message });
  }

  console.error('Unhandled request error:', err);
  return res.status(500).json({ message: 'Internal server error.' });
});

console.log('[assistant] Sarathi learning assistant active: Study Hub, portfolio, exams, and general concepts.');

const server = app.listen(port, () => {
  console.log(`[server]: Server is running on port ${port}`);
});

const closeMongoConnection = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('[db] Error disconnecting MongoDB:', error);
  }
};

let isShuttingDown = false;

const shutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[server] ${signal} received. Closing HTTP server and MongoDB connection.`);
  const closableServer = server as typeof server & {
    closeIdleConnections?: () => void;
    closeAllConnections?: () => void;
  };

  closableServer.closeIdleConnections?.();

  const shutdownTimeout = setTimeout(async () => {
    console.warn('[server] Graceful shutdown timed out. Closing active connections.');
    closableServer.closeAllConnections?.();
    await closeMongoConnection();
    process.exit(0);
  }, 10000);
  shutdownTimeout.unref();

  server.close(async (error?: Error) => {
    clearTimeout(shutdownTimeout);
    if (error) {
      console.error('[server] Error closing HTTP server:', error);
      await closeMongoConnection();
      process.exit(1);
    }

    await closeMongoConnection();
    console.log('[server] Shutdown complete.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
