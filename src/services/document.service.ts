import { documentRepository } from '../repositories/document.repository';
import { jobRepository } from '../repositories/job.repository';
import { schemaRepository } from '../repositories/schema.repository';
import { computeFileHash } from '../utils/hash';
import { DocumentResponse, DocumentStatusResponse } from '../types/document.types';

function toResponse(doc: any): DocumentResponse {
  return {
    id: doc.id,
    originalFileName: doc.originalFileName,
    mimeType: doc.mimeType,
    status: doc.status,
    schemaId: doc.schemaId,
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const documentService = {
  async upload(file: Express.Multer.File, schemaId?: string): Promise<DocumentResponse> {
    // Validate schema exists if provided
    if (schemaId) {
      const schema = await schemaRepository.findById(schemaId);
      if (!schema) {
        throw new Error(`Schema with id "${schemaId}" not found`);
      }
    }

    // Idempotency — check for duplicate file by content hash
    const contentHash = await computeFileHash(file.path);
    const existing = await documentRepository.findByHash(contentHash);
    if (existing) {
      return toResponse(existing);
    }

    // Create document record
    const document = await documentRepository.create({
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      storagePath: file.path,
      contentHash,
      schemaId,
    });

    // Queue a job for async processing
    await jobRepository.create(document.id);

    return toResponse(document);
  },

  async getById(id: string): Promise<DocumentResponse> {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new Error(`Document with id "${id}" not found`);
    return toResponse(doc);
  },

  async getStatus(id: string): Promise<DocumentStatusResponse> {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new Error(`Document with id "${id}" not found`);
    return {
      id: doc.id,
      status: doc.status,
      errorMessage: doc.errorMessage,
      updatedAt: doc.updatedAt,
    };
  },

  async reprocess(id: string): Promise<DocumentResponse> {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new Error(`Document with id "${id}" not found`);

    if (doc.status === 'PROCESSING') {
      throw new Error('Document is currently being processed');
    }

    await documentRepository.updateStatus(id, 'PENDING');
    await jobRepository.create(id);

    return toResponse({ ...doc, status: 'PENDING', errorMessage: null });
  },
};