export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface DocumentResponse {
  id: string;
  originalFileName: string;
  mimeType: string;
  status: DocumentStatus;
  schemaId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentStatusResponse {
  id: string;
  status: DocumentStatus;
  errorMessage: string | null;
  updatedAt: Date;
}
