import { Router } from 'express';
import { schemaController } from '../controllers/schema.controller';

const router = Router();

router.post('/', schemaController.create);
router.get('/', schemaController.listAll);
router.get('/:id', schemaController.getById);

export default router;