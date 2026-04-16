import express from 'express';
import { env } from './config/env';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

// Routes will be added here in Milestone 2 and 3

export default app;