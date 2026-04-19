import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractionService } from '../src/services/extraction.service';
import { openai } from '../src/lib/openai';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    document: { findUnique: vi.fn() },
    extractionResult: { upsert: vi.fn() },
  },
}));

vi.mock('../src/utils/text-extractor', () => ({
  extractText: vi.fn().mockResolvedValue(
    'Invoice from Acme Corp. Invoice number: INV-001. Total: 500.'
  ),
}));

const mockSchema = {
  id: 'schema-1',
  name: 'invoice',
  description: 'Invoice schema',
  definition: {
    type: 'object',
    properties: {
      vendorName: { type: 'string' },
      invoiceNumber: { type: 'string' },
      totalAmount: { type: 'number' },
    },
    required: ['vendorName', 'invoiceNumber', 'totalAmount'],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDocument = {
  id: 'doc-1',
  originalFileName: 'invoice.txt',
  mimeType: 'text/plain',
  storagePath: 'uploads/invoice.txt',
  contentHash: 'abc123',
  status: 'PENDING' as const,
  schemaId: 'schema-1',
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  schema: mockSchema,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('extractionService.extract', () => {
  it('extracts and saves structured data when LLM returns valid JSON', async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);
    vi.mocked(openai.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              vendorName: 'Acme Corp',
              invoiceNumber: 'INV-001',
              totalAmount: 500,
            }),
          },
        },
      ],
    } as any);
    vi.mocked(prisma.extractionResult.upsert).mockResolvedValue({} as any);

    await extractionService.extract('doc-1');

    expect(prisma.extractionResult.upsert).toHaveBeenCalledOnce();
    const upsertCall = vi.mocked(prisma.extractionResult.upsert).mock.calls[0][0];
    expect(upsertCall.create.extractedData).toMatchObject({
      vendorName: 'Acme Corp',
      invoiceNumber: 'INV-001',
      totalAmount: 500,
    });
  });

  it('throws when LLM returns invalid JSON', async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);
    vi.mocked(openai.chat.completions.create).mockResolvedValue({
      choices: [{ message: { content: 'not valid json at all' } }],
    } as any);

    await expect(extractionService.extract('doc-1')).rejects.toThrow('invalid JSON');

    expect(prisma.extractionResult.upsert).not.toHaveBeenCalled();
  });

  it('throws when extracted data fails schema validation', async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);
    vi.mocked(openai.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              vendorName: 'Acme Corp',
              invoiceNumber: 'INV-001',
              totalAmount: 'not-a-number',
            }),
          },
        },
      ],
    } as any);

    await expect(extractionService.extract('doc-1')).rejects.toThrow('schema validation');

    expect(prisma.extractionResult.upsert).not.toHaveBeenCalled();
  });

  it('throws when document is not found', async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

    await expect(extractionService.extract('nonexistent')).rejects.toThrow('not found');
  });
});