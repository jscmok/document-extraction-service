import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { startWorker } from './workers/document.worker';

async function main() {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log('Database connected');

  startWorker();

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});