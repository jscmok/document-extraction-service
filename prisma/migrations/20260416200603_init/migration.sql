-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Schema" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "schemaId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionJob" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionResult" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Schema_name_key" ON "Schema"("name");

-- CreateIndex
CREATE INDEX "Document_contentHash_idx" ON "Document"("contentHash");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "ExtractionJob_documentId_idx" ON "ExtractionJob"("documentId");

-- CreateIndex
CREATE INDEX "ExtractionJob_status_idx" ON "ExtractionJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionResult_documentId_key" ON "ExtractionResult"("documentId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "Schema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionJob" ADD CONSTRAINT "ExtractionJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionResult" ADD CONSTRAINT "ExtractionResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionResult" ADD CONSTRAINT "ExtractionResult_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "Schema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
