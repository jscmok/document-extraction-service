
import Ajv from 'ajv';
import { schemaRepository } from '../repositories/schema.repository';
import { CreateSchemaDto, SchemaResponse } from '../types/schema.types';

const ajv = new Ajv();

function toResponse(schema: any): SchemaResponse {
  return {
    id: schema.id,
    name: schema.name,
    description: schema.description,
    definition: schema.definition as Record<string, unknown>,
    createdAt: schema.createdAt,
    updatedAt: schema.updatedAt,
  };
}

export const schemaService = {
  async create(data: CreateSchemaDto): Promise<SchemaResponse> {
    // Validate that the definition is a valid JSON Schema
    const isValid = ajv.validateSchema(data.definition);
    if (!isValid) {
      throw new Error('Invalid JSON Schema definition');
    }

    // Check for duplicate name
    const existing = await schemaRepository.findByName(data.name);
    if (existing) {
      throw new Error(`Schema with name "${data.name}" already exists`);
    }

    const schema = await schemaRepository.create(data);
    return toResponse(schema);
  },

  async listAll(): Promise<SchemaResponse[]> {
    const schemas = await schemaRepository.findAll();
    return schemas.map(toResponse);
  },

  async getById(id: string): Promise<SchemaResponse> {
    const schema = await schemaRepository.findById(id);
    if (!schema) {
      throw new Error(`Schema with id "${id}" not found`);
    }
    return toResponse(schema);
  },
};