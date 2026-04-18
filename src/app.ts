import express from 'express';
import { env } from './config/env';
import { schemaRoutes } from './routes/schema.routes';
import documentRoutes from './routes/document.routes';

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

export default app;