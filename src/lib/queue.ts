import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

export const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
});

export const EXTRACTION_QUEUE = 'document-extraction';

export const extractionQueue = new Queue(EXTRACTION_QUEUE, { connection });

export type ExtractionJobData = {
  documentId: string;
  attemptNumber: number;
};