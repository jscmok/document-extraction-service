
import { prisma } from '../lib/prisma';
import { CreateSchemaDto } from '../types/schema.types';

export const schemaRepository = {
  async create(data: CreateSchemaDto) {
    return prisma.schema.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        definition: data.definition,
      },
    });
  },

  async findAll() {
    return prisma.schema.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.schema.findUnique({
      where: { id },
    });
  },

  async findByName(name: string) {
    return prisma.schema.findUnique({
      where: { name },
    });
  },
};