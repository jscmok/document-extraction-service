
import { Request, Response, NextFunction } from 'express';
import { schemaService } from '../services/schema.service';

export const schemaController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, definition } = req.body;

      if (!name || !definition) {
        res.status(400).json({ error: 'name and definition are required' });
        return;
      }

      const schema = await schemaService.create({ name, description, definition });
      res.status(201).json(schema);
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('Invalid JSON Schema')) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  },

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const schemas = await schemaService.listAll();
      res.json(schemas);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = await schemaService.getById(req.params.id);
      res.json(schema);
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
};