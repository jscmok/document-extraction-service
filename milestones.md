# Document Extraction Service

# Milestone 2
layers of methods split into different files:
- repository to talk to db using Prisma and SQL
- service to handle business rules and validations
- controller to talk to HTTP and handle requests, responses, status codes

types:
separate from prisma types so if db modfel changes, this controls what is exposed in api
- schemaDTO for shape that comes from a POST request
 - definition Record<string,unknown> because it is a JSON schema object with an unknown key-value structure
- schemaResponse for shape of response sent back to caller
 - includes original fields and auto-generated fields (id, createdat, updatedat)

repository:
4 methods, database access without logic
- create
- findall to return rows by newest
- findbyid to find on ID PK
- findbyname to find on name unique index

service:
3 methods, business logic decisions with validation and checks
- toResponse() as a mapper to convert Prisma row to SchemaResponse (align API shape with DB shape)
- create
 - ajv to validate schema as valid JSON
 - findbyname to detct duplicates
 - repository can write to db
- listall wrapper around repo
- getbyid wrapper around repo, converts null to error

controller:
- HTTP in and out
- parse -> validate inputs -> call service -> send response -> catch errors
- "create" API response of 201 if created, 400 if exists or missing input
- "listall" API response of 200 with array
- "getbyid" API response of id, 404 if not found

routes:
- Express router mapping API methods used in app.ts

app.ts:
- builds express app

server.ts:
- calls app.listen()

# Milestone 3

same layers as Milestone 2 but for documents and jobs

types:
- DocumentStatus / JobStatus union types mirroring Prisma enums
- DocumentResponse full shape (excludes storagePath and contentHash, internal only)
- DocumentStatusResponse slim shape for polling (id, status, errorMessage, updatedAt)

utils/hash.ts:
- SHA-256 hash of file content for duplicate detection

lib/upload.ts:
- Multer diskStorage saving to env.UPLOAD_DIR with unique filename
- fileFilter to reject non text/plain files
- 10 MB file size limit

document.repository.ts:
5 methods, database access without logic
- create
- findbyid includes result so extractionresult is fetched
- findbyhash uses findFirst (hash is index, not unique)
- updatestatus
- findpending oldest-first for worker to pick up

job.repository.ts:
4 methods, database access without logic
- create with attemptnumber default to 1
- findnextqueued FIFO, includes document for worker
- updatestatus sets startedat on RUNNING, completedat on SUCCEEDED/FAILED
- countattempts for worker to enforce MAX_RETRY_ATTEMPTS

document.service.ts:
4 methods, business logic decisions
- upload: validate schemaId → hash file → return existing if duplicate → create doc → queue job
- getbyid wrapper around repo
- gesStatus wrapper around repo, returns slim documentstatusresponse
- reprocess: guard against PROCESSING → reset to PENDING → create new job

document.controller.ts:
- same pattern as milestone 2
- upload checks req.file before calling service, returns 202
- reprocess returns 202, adds 409 Conflict for "currently being processed"

document.routes.ts:
- upload.single('file') middleware populates req.file before controller runs

app.ts:
- mounts documentroutes at /documents

# Milestone 4

async engine that makes the 202 pattern real — worker picks up queued jobs and runs the extraction pipeline

utils/text-extractor.ts:
- reads .txt file from disk, returns content as a string
- only code touching the file system for content

lib/openai.ts:
- singleton OpenAI client, created once and reused everywhere

extraction.service.ts:
2 methods, core of service
- extract: load doc + schema → read file text → build dynamic prompt from schema → call OpenAI → validate JSON response → upsert extractionresult
- classifydocument: called if no schemaid → if one schema exists return it or else send to OpenAI to pick best match → fallback to first schema

document.worker.ts:
- polling loop
- processnextjob: pick up next QUEUED job → mark job RUNNING and doc PROCESSING → call extractionservice → if success mark SUCCEEDED/COMPLETED or if failure check MAX_RETRY_ATTEMPTS → re-queue or mark FAILED
- startworker: guards against double-start with running flag, calls poll() recursively via setTimeout in finally block so errors don't stop the loop
- stopWorker: clean shutdown

server.ts:
- calls startworker() after DB connects
