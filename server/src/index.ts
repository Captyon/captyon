import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import projectsRouter from './routes/projects';
import apiKeyMiddleware from './middleware/auth';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/captionstudio';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));

// CORS handling: allow configured origins (comma separated) or allow all
if (CORS_ORIGINS.length === 1 && CORS_ORIGINS[0] === '*') {
  app.use(cors());
} else {
  app.use(cors({
    origin: (origin, callback) => {
      // allow non-browser (curl/postman) requests with no origin
      if (!origin) return callback(null, true);
      if (CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    }
  }));
}

// basic rate limiting
app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }));

// Optional API key middleware (no-op if API_KEY unset)
app.use(apiKeyMiddleware);

 // Health check
app.get('/', (_req, res) => res.json({ ok: true, api: true }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// Projects endpoints
app.use('/projects', projectsRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Server error' });
});

// Connect to MongoDB and start server
mongoose.connect(MONGODB_URI, { autoIndex: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
