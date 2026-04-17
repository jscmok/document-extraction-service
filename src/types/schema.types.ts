export interface CreateSchemaDto {
  name: string;
  description?: string;
  definition: Record<string, unknown>;
}

export interface SchemaResponse {
  id: string;
  name: string;
  description: string | null;
  definition: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}