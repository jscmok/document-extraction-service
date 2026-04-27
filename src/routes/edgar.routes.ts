import { Router } from 'express';
import { edgarController } from '../controllers/edgar.controller';

export const edgarRoutes = Router();

edgarRoutes.get('/:ticker', edgarController.ingest);