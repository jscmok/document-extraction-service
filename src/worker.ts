
import 'dotenv/config';
import { prisma } from './lib/prisma';
import { startWorker, stopWorker } from './workers/document.worker';

async function main() {
  await prisma.$connect();
  console.log('[worker process] database connected');

  startWorker();

  process.on('SIGTERM', async () => {
    console.log('[worker process] SIGTERM received, shutting down');
    stopWorker();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[worker process] SIGINT received, shutting down');
    stopWorker();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[worker process] failed to start:', err);
  process.exit(1);
});