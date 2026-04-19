import { describe, it, expect, vi, beforeEach } from 'vitest';
import { schemaService } from '../src/services/schema.service';
import { schemaRepository } from '../src/repositories/schema.repository';

vi.mock('../src/repositories/schema.repository');

const mockSchema = {
  id: 'test-id-1',
  name: 'invoice',
  description: 'Invoice schema',
  definition: {
    type: 'object',
    properties: {
      vendorName: { type: 'string' },
      totalAmount: { type: 'number' },
    },
    required: ['vendorName', 'totalAmount'],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('schemaService.create', () => {
  it('creates a schema successfully with valid definition', async () => {
    vi.mocked(schemaRepository.findByName).mockResolvedValue(null);
    vi.mocked(schemaRepository.create).mockResolvedValue(mockSchema);

    const result = await schemaService.create({
      name: 'invoice',
      definition: mockSchema.definition,
    });

    expect(result.name).toBe('invoice');
    expect(result.id).toBe('test-id-1');
    expect(schemaRepository.create).toHaveBeenCalledOnce();
  });

  it('throws if schema name already exists', async () => {
    vi.mocked(schemaRepository.findByName).mockResolvedValue(mockSchema);

    await expect(
      schemaService.create({ name: 'invoice', definition: mockSchema.definition })
    ).rejects.toThrow('already exists');

    expect(schemaRepository.create).not.toHaveBeenCalled();
  });

  it('throws if definition is not a valid JSON Schema', async () => {
    vi.mocked(schemaRepository.findByName).mockResolvedValue(null);

    await expect(
      schemaService.create({
        name: 'bad-schema',
        definition: { type: 'not-a-valid-type' } as any,
      })
    ).rejects.toThrow('Invalid JSON Schema');

    expect(schemaRepository.create).not.toHaveBeenCalled();
  });
});

describe('schemaService.listAll', () => {
  it('returns all schemas', async () => {
    vi.mocked(schemaRepository.findAll).mockResolvedValue([mockSchema]);

    const result = await schemaService.listAll();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('invoice');
  });

  it('returns empty array when no schemas exist', async () => {
    vi.mocked(schemaRepository.findAll).mockResolvedValue([]);

    const result = await schemaService.listAll();

    expect(result).toHaveLength(0);
  });
});