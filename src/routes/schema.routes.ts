import { Router } from 'express';
import { schemaController } from '../controllers/schema.controller';

export const schemaRoutes = Router();

schemaRoutes.post('/', schemaController.create);
schemaRoutes.get('/', schemaController.listAll);
schemaRoutes.get('/:id', schemaController.getById);