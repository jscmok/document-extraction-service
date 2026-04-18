
import { prisma } from '../lib/prisma';
import { DocumentStatus } from '../types/document.types';

export const documentRepository = {
  async create(data: {
    originalFileName: string;
    mimeType: string;
    storagePath: string;
    contentHash: string;
    schemaId?: string;
  }) {
    return prisma.document.create({ data });
  },

  async findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: { result: true },
    });
  },

  async findByHash(contentHash: string) {
    return prisma.document.findFirst({
      where: { contentHash },
    });
  },

  async updateStatus(id: string, status: DocumentStatus, errorMessage?: string) {
    return prisma.document.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
      },
    });
  },

  async findPending() {
    return prisma.document.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  },
};