import { prisma } from '../lib/prisma';
import { JobStatus } from '../types/document.types';

export const jobRepository = {
  async create(documentId: string, attemptNumber = 1) {
    return prisma.extractionJob.create({
      data: { documentId, attemptNumber },
    });
  },

  async findNextQueued() {
    return prisma.extractionJob.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      include: { document: true },
    });
  },

  async updateStatus(id: string, status: JobStatus, errorMessage?: string) {
    return prisma.extractionJob.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        startedAt: status === 'RUNNING' ? new Date() : undefined,
        completedAt: ['SUCCEEDED', 'FAILED'].includes(status) ? new Date() : undefined,
      },
    });
  },

  async countAttempts(documentId: string) {
    return prisma.extractionJob.count({
      where: { documentId },
    });
  },
};