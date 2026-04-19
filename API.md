# APIs
# route -> controller -> service -> repository

API scenarios:
- POST /schemas (create)
 - 2xx
 - 400 with invalid JSON schema definition
 - 400 existing schema name
- GET /schemas (listall)
 - 200 ok
- GET /schemas/:id (getbyid)
 - 200 ok
 - 404 with id not found
 #
- POST /documents (upload)
 - 202 file received
 - 400 no file uploaded
 - 400 schema not found
 - 400 only .txt
- GET /documents/:id (getbyid)
 - 200 ok
 - 200 ok failed error 401 incorrect API
- GET /documents/:id/status (getstatus)
 - 200 ok
 - 404 file not found
 - 200 ok failed error 401 incorrect API
- POST /documents/:id/reprocess (reprocess)
 - 202 accepted
 - 404 file not found
 - 409 being processed
- POST /documents/:id/result ()
 - 202 accepted
 - 409 document not completed status: pending
 - 409 document not completed status: failed
 