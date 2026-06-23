import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1', routes);
  app.use(errorHandler);

  return app;
}
