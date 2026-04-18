import { env } from '../config/env';
import { documentRepository } from '../repositories/document.repository';
import { jobRepository } from '../repositories/job.repository';
import { extractionService } from '../services/extraction.service';

let running = false;

async function processNextJob(): Promise<void> {
  const job = await jobRepository.findNextQueued();
  if (!job) return;

  const { document } = job;
  console.log(`[worker] picking up job ${job.id} for document ${document.id}`);

  // Mark job and document as in-progress
  await jobRepository.updateStatus(job.id, 'RUNNING');
  await documentRepository.updateStatus(document.id, 'PROCESSING');

  try {
    await extractionService.extract(document.id);

    await jobRepository.updateStatus(job.id, 'SUCCEEDED');
    await documentRepository.updateStatus(document.id, 'COMPLETED');
    console.log(`[worker] completed document ${document.id}`);
  } catch (err: any) {
    console.error(`[worker] failed document ${document.id}:`, err.message);

    const attempts = await jobRepository.countAttempts(document.id);

    if (attempts < env.MAX_RETRY_ATTEMPTS) {
      // Re-queue for retry
      console.log(`[worker] re-queuing document ${document.id} (attempt ${attempts + 1})`);
      await jobRepository.updateStatus(job.id, 'FAILED', err.message);
      await documentRepository.updateStatus(document.id, 'PENDING');
      await jobRepository.create(document.id, attempts + 1);
    } else {
      // Give up
      console.log(`[worker] giving up on document ${document.id} after ${attempts} attempts`);
      await jobRepository.updateStatus(job.id, 'FAILED', err.message);
      await documentRepository.updateStatus(document.id, 'FAILED', err.message);
    }
  }
}

export function startWorker(): void {
  if (running) return;
  running = true;
  console.log(`[worker] started — polling every ${env.WORKER_POLL_INTERVAL_MS}ms`);

  const poll = async () => {
    try {
      await processNextJob();
    } catch (err) {
      console.error('[worker] unexpected error in poll cycle:', err);
    } finally {
      if (running) setTimeout(poll, env.WORKER_POLL_INTERVAL_MS);
    }
  };

  poll();
}

export function stopWorker(): void {
  running = false;
  console.log('[worker] stopped');
}