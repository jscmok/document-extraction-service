# Document Extraction Service

A schema-driven document extraction service (SDES) that receives schemas, ingests documents, extracts structured, queryable data using LLM. Users define extraction schemas ahead of time, upload documents, and the system asynchronously extracts structured JSON output that conforms to the defined schema.

Multiple document types via runtime schema definition:
The service supports any document type (eg. invoice, contract, employees, medical record, etc). Users define schemas via POST /schemas using standard JSON Schema format that are stored in the database. SDES builds extraction prompts dynamically at runtime. Adding a new document type is a single API call, not a deployment.

---

## How it works

1. Define a schema 
— POST a JSON Schema definition with the fields (e.g. name, invoice number, amount)
2. Upload a document
— POST a .txt file while (optionally) referencing a schema
3. Worker processes
— background worker picks up the job, reads the file, builds a dynamic prompt from stored schema, calls OpenAI API, validates the response, then saves the result
4. Fetch the result 
— GET the structured extracted data from the database

---

## Tech stack

| Category | Choice |
|---|---|
| Language | TypeScript |
| Framework | Express |
| ORM | Prisma |
| Database | PostgreSQL |
| File uploads | Multer |
| JSON validation | Ajv |
| LLM | OpenAI API |
| Tests | Vitest |

---

## Deliberate decisions

| Decision | Reason |
|---|---|
| .txt files only | LLMs operate on text. PDF/Word (other file types) support require the addition of `pdf-parse` or `mammoth` to text-extractor.ts — the rest of the pipeline requires no changes |
| DB-backed worker instead of BullMQ/Redis | Removes Redis dependency for self-contained SDES submission. In production, SQS or BullMQ would provide better infra for proper queues with job states, events, priority, concurrency, retries, job visibility |
| Local file storage instead of S3 | Keeps submission runnable without cloud credentials. In production, files would be stored in S3 with object keys persisted in the db |
| PostGreSQL | I considered NoSQL, but quickly crossed out given the SDES features user-defined (aka known) schemas and relationships would be harder to enforce. The data objects also have relationships that are defined by a relational model with PK and FKs, easier to enforce. PostGres also has native JSONB support allowing flexible JSON blobs from schema definitions and extraction results. |
| PostGreSQL | I considered NoSQL, but quickly crossed out given the SDES features user-defined (aka known) schemas and relationships would be harder to enforce. The data objects also have relationships that are defined by a relational model with PK and FKs, easier to enforce. PostGres also has native JSONB support allowing flexible JSON blobs from schema definitions and extraction results. |

---

## Production grade system (AWS)

- API and Worker: ECS or Kubernetes
- Database: RDS PostgreSQL or Aurora
- Document Storage: S3
- Job Queueing with DLQ: SQS or BullMQ
- Observability: CloudWatch or Datadog
- Key Management: Secrets Manager

## Running locally

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or hosted)
- OpenAI API key

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/document-extraction-service
cd document-extraction-service
npm install
cp .env.example .env
```

Fill in `.env`:
```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
OPENAI_API_KEY="sk-..."
PORT=3000
NODE_ENV="development"
UPLOAD_DIR="uploads"
WORKER_POLL_INTERVAL_MS=3000
MAX_RETRY_ATTEMPTS=3
```

```bash
mkdir uploads
npx prisma migrate dev --name init
npm run dev
```

Server runs at `http://localhost:3000`.

### Database options

Hosted: 
Create a free project at (https://neon.tech), copy the connection string into .env DATABASE_URL.

Local: 
Install PostgreSQL, create a database called extraction_db, and set DATABASE_URL="postgresql://postgres:password@localhost:5432/extraction_db".

---

## API

## Postman
Also included in postman_collection.json

### Schemas

```
POST   /schemas          Create a schema
GET    /schemas          List all schemas
GET    /schemas/:id      Get a schema by ID
```

**Create schema example:**
```bash
POST http://localhost:3000/schemas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invoice",
    "description": "Extract invoice fields",
    "definition": {
      "type": "object",
      "properties": {
        "vendorName": { "type": "string" },
        "invoiceNumber": { "type": "string" },
        "totalAmount": { "type": "number" }
      },
      "required": ["vendorName", "invoiceNumber", "totalAmount"]
    }
  }'
```

### Documents

```
POST   /documents                  Upload a document (multipart/form-data)
GET    /documents/:id              Get document metadata
GET    /documents/:id/status       Get processing status
GET    /documents/:id/result       Get extracted data
POST   /documents/:id/reprocess    Re-queue for extraction
```

**Upload document example:**

curl -X POST http://localhost:3000/documents \
  -F "file=@invoice.txt" \
  -F "schemaId=YOUR_SCHEMA_ID"


**Poll status, then fetch result:**

curl http://localhost:3000/documents/YOUR_DOCUMENT_ID/status
curl http://localhost:3000/documents/YOUR_DOCUMENT_ID/result


### Health check

GET    /health

---

## Document lifecycle

Upload → PENDING → PROCESSING → COMPLETED
                     ↘ FAILED → (reprocess) → PENDING

Processing is asynchronous. The upload endpoint always returns 202 Accepted. GET /documents/:id/status to know when extraction is complete.

---

## Running tests

npm test

Tests cover:
- Schema service — duplicate detection, invalid schema rejection
- Extraction service — valid extraction, invalid JSON from LLM, schema validation failure
- Document API — HTTP status codes, response shapes, error handling

---

## Key design decisions

Schema-driven extraction (not hard-coded)
Document types and extraction fields are defined at runtime via the API and stored in the database. The LLM prompt is built dynamically from the stored JSON Schema definition, avoiding hard-coded logic (eg. `if (type === 'invoice')` ).

Asynchronous processing
Document upload returns 202 Accepted immediately. A DB-backed polling worker handles extraction asynchronously. This displays production ingestion behavior where LLM calls can take several seconds and should not hang the HTTP response.

Idempotent uploads via content hash (handles dupe submissions)
Each uploaded file is SHA-256 hashed so uploading the same file multiple times returns the existing document record rather than creating a duplicate. This handles retried uploads.

Status tracking table
With the Document and the ExtractionJob tables, they both hold status columns to track status of whether a Document was processed and extracted (COMPLETED vs. FAILED) and whether an ExtractionJob was finished successfully (SUCCEEDED vs. FAILED).

Output validation with Ajv
LLM responses are validated against stored JSON Schema using Ajv. If the model returns wrong types, missing required fields, etc., the job fails with an error.

Retry / Reprocessing logic with audit trail
Each processing (/ reprocessing) attempt creates a new ExtractionJob row, on failures SDES retries up to MAX_RETRY_ATTEMPTS times before marking a document failed. Every attempt's status and error message is stored in db.

Auto-classification
If no schemaId is provided, SDES asks the LLM to classify the document regardless of input size and structure against all available schemas and routes it automatically.

---

