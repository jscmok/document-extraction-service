
import { config } from 'dotenv';

config();

// Ensure required env vars exist for tests
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.NODE_ENV = 'test';

// Mock BullMQ queue so tests never try to connect to Redis
vi.mock('../src/lib/queue', () => ({
  extractionQueue: {
    add: vi.fn().mockResolvedValue({}),
  },
  connection: {},
  EXTRACTION_QUEUE: 'test-queue',
}));