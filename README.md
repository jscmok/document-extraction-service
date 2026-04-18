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
