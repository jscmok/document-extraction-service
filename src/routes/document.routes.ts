import { Router } from 'express';
import { upload } from '../lib/upload';
import { documentController } from '../controllers/document.controller';

const router = Router();

router.post('/', upload.single('file'), documentController.upload);
router.get('/:id', documentController.getById);
router.get('/:id/status', documentController.getStatus);
router.post('/:id/reprocess', documentController.reprocess);

export default router;