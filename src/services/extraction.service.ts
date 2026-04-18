import Ajv from 'ajv';
import { openai } from '../lib/openai';
import { prisma } from '../lib/prisma';
import { schemaRepository } from '../repositories/schema.repository';

const ajv = new Ajv({ coerceTypes: true, useDefaults: true });

function buildPrompt(schemaDefinition: Record<string, unknown>, documentText: string): string {
  return `You are a data extraction assistant. Extract structured data from the document below.

Return a JSON object that conforms exactly to this JSON Schema:
${JSON.stringify(schemaDefinition, null, 2)}

Rules:
- Return only valid JSON. No markdown, no code fences, no explanation.
- Use null for any field that cannot be determined from the document.
- Do not invent or guess values not present in the document.

Document:
${documentText}`;
}

export const extractionService = {
  async extract(documentId: string): Promise<void> {
    // Load document with schema
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { schema: true },
    });

    if (!document) throw new Error(`Document ${documentId} not found`);

    // Resolve schema — use linked schema or auto-classify
    let schema = document.schema;
    if (!schema) {
      schema = await extractionService.classifyDocument(documentId);
    }
    if (!schema) throw new Error('No schema could be determined for this document');

    // Read file text
    const { extractText } = await import('../utils/text-extractor');
    const text = await extractText(document.storagePath);

    if (!text) throw new Error('Document appears to be empty');

    // Build prompt dynamically from stored schema definition
    const schemaDefinition = schema.definition as Record<string, unknown>;
    const prompt = buildPrompt(schemaDefinition, text);

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('OpenAI returned an empty response');

    // Parse JSON
    let extracted: unknown;
    try {
      extracted = JSON.parse(raw);
    } catch {
      throw new Error(`OpenAI returned invalid JSON: ${raw}`);
    }

    // Validate against stored schema
    const validate = ajv.compile(schemaDefinition);
    const valid = validate(extracted);
    if (!valid) {
      const errors = ajv.errorsText(validate.errors);
      throw new Error(`Extracted data failed schema validation: ${errors}`);
    }

    // Save result
    await prisma.extractionResult.upsert({
      where: { documentId },
      create: {
        documentId,
        schemaId: schema.id,
        extractedData: extracted as object,
      },
      update: {
        extractedData: extracted as object,
        schemaId: schema.id,
      },
    });
  },

  async classifyDocument(documentId: string) {
    // Load all schemas for classification
    const schemas = await schemaRepository.findAll();
    if (schemas.length === 0) return null;
    if (schemas.length === 1) return schemas[0];

    // Load document text for classification
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) return null;

    const { extractText } = await import('../utils/text-extractor');
    const text = await extractText(document.storagePath);
    const excerpt = text.slice(0, 500);

    // Ask OpenAI to pick the best schema
    const schemaList = schemas
      .map((s, i) => `${i + 1}. "${s.name}" — ${s.description ?? 'no description'}`)
      .join('\n');

    const prompt = `Given the following document excerpt, which schema best describes it?

Schemas:
${schemaList}

Document excerpt:
${excerpt}

Reply with only the schema name, exactly as written above. No explanation.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const chosen = completion.choices[0]?.message?.content?.trim();
    return schemas.find((s) => s.name === chosen) ?? schemas[0];
  },
};