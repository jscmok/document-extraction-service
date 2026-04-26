import { Worker, Job } from 'bullmq';
import { connection, EXTRACTION_QUEUE, ExtractionJobData } from '../lib/queue';
import { documentRepository } from '../repositories/document.repository';
import { jobRepository } from '../repositories/job.repository';
import { extractionService } from '../services/extraction.service';

let worker: Worker | null = null;

async function processJob(job: Job<ExtractionJobData>): Promise<void> {
  const { documentId } = job.data;
  console.log(`[worker] processing job ${job.id} for document ${documentId}`);

  await documentRepository.updateStatus(documentId, 'PROCESSING');
  const dbJob = await jobRepository.create(documentId, job.attemptsMade + 1);

  try {
    await jobRepository.updateStatus(dbJob.id, 'RUNNING');
    await extractionService.extract(documentId);
    await jobRepository.updateStatus(dbJob.id, 'SUCCEEDED');
    await documentRepository.updateStatus(documentId, 'COMPLETED');
    console.log(`[worker] completed document ${documentId}`);
  } catch (err: any) {
    await jobRepository.updateStatus(dbJob.id, 'FAILED', err.message);
    const willRetry = job.attemptsMade + 1 < (job.opts.attempts ?? 1);
    await documentRepository.updateStatus(
      documentId,
      willRetry ? 'PENDING' : 'FAILED',
      willRetry ? undefined : err.message
    );
    throw err;
  }
}

export function startWorker(): void {
  if (worker) return;

  worker = new Worker(EXTRACTION_QUEUE, processJob, {
    connection,
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    console.log(`[worker] job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  console.log('[worker] BullMQ worker started — event-driven, no polling');
}

export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[worker] stopped');
  }
}