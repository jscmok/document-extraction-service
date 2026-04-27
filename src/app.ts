import express from 'express';
import { env } from './config/env';
import { schemaRoutes } from './routes/schema.routes';
import { documentRoutes } from './routes/document.routes';
import { edgarRoutes } from './routes/edgar.routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

// Routes
app.use('/schemas', schemaRoutes);
app.use('/documents', documentRoutes);
app.use('/filings', edgarRoutes);

// 404 for unmatched routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use(errorHandler);

export default app;