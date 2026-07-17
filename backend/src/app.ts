import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { mountSwagger } from './swagger.js';
import { mountCoverageReport } from './coverageReport.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5001' }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  mountSwagger(app);
  mountCoverageReport(app);

  app.use('/api/v1', routes);
  app.use(errorHandler);

  return app;
}
