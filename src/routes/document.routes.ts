import { Router } from 'express';
import { upload } from '../lib/upload';
import { documentController } from '../controllers/document.controller';

export const documentRoutes = Router();

documentRoutes.post('/', upload.single('file'), documentController.upload);
documentRoutes.get('/:id', documentController.getById);
documentRoutes.get('/:id/status', documentController.getStatus);
documentRoutes.post('/:id/reprocess', documentController.reprocess);