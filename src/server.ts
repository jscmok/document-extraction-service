import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

async function main() {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log('Database connected');

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log('Worker run via: npm run worker');
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});