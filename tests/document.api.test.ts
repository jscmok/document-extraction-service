import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { documentService } from '../src/services/document.service';

vi.mock('../src/services/document.service');
vi.mock('../src/workers/document.worker', () => ({
  startWorker: vi.fn(),
  stopWorker: vi.fn(),
}));

const mockDocument = {
  id: 'doc-1',
  originalFileName: 'invoice.txt',
  mimeType: 'text/plain',
  status: 'PENDING',
  schemaId: 'schema-1',
  errorMessage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockResult = {
  documentId: 'doc-1',
  schemaId: 'schema-1',
  status: 'COMPLETED',
  extractedData: {
    vendorName: 'Acme Corp',
    invoiceNumber: 'INV-001',
    totalAmount: 500,
  },
  extractedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /documents/:id', () => {
  it('returns document when found', async () => {
    vi.mocked(documentService.getById).mockResolvedValue(mockDocument as any);

    const res = await request(app).get('/documents/doc-1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('doc-1');
    expect(res.body.status).toBe('PENDING');
  });

  it('returns 404 when document not found', async () => {
    vi.mocked(documentService.getById).mockRejectedValue(
      new Error('Document with id "bad-id" not found')
    );

    const res = await request(app).get('/documents/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });
});

describe('GET /documents/:id/status', () => {
  it('returns status for existing document', async () => {
    vi.mocked(documentService.getStatus).mockResolvedValue({
      id: 'doc-1',
      status: 'COMPLETED',
      errorMessage: null,
      updatedAt: new Date(),
    } as any);

    const res = await request(app).get('/documents/doc-1/status');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
  });
});

describe('GET /documents/:id/result', () => {
  it('returns extracted data for completed document', async () => {
    vi.mocked(documentService.getResult).mockResolvedValue(mockResult as any);

    const res = await request(app).get('/documents/doc-1/result');

    expect(res.status).toBe(200);
    expect(res.body.extractedData).toMatchObject({
      vendorName: 'Acme Corp',
      totalAmount: 500,
    });
  });

  it('returns 409 when document is not yet completed', async () => {
    vi.mocked(documentService.getResult).mockRejectedValue(
      new Error('Document is not yet completed. Current status: PENDING')
    );

    const res = await request(app).get('/documents/doc-1/result');

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('not yet completed');
  });
});

describe('POST /documents/:id/reprocess', () => {
  it('returns 202 when reprocess succeeds', async () => {
    vi.mocked(documentService.reprocess).mockResolvedValue(mockDocument as any);

    const res = await request(app).post('/documents/doc-1/reprocess');

    expect(res.status).toBe(202);
    expect(res.body.id).toBe('doc-1');
  });

  it('returns 409 when document is currently processing', async () => {
    vi.mocked(documentService.reprocess).mockRejectedValue(
      new Error('Document is currently being processed')
    );

    const res = await request(app).post('/documents/doc-1/reprocess');

    expect(res.status).toBe(409);
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('404 handler', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});