
import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service';

export const documentController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const schemaId = req.body.schemaId as string | undefined;
      const document = await documentService.upload(req.file, schemaId);

      // 202 Accepted — file received, processing will happen asynchronously
      res.status(202).json(document);
    } catch (err: any) {
      if (err.message?.includes('not found') || err.message?.includes('Only .txt')) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await documentService.getById(req.params['id'] as string);
      res.json(doc);
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  },

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await documentService.getStatus(req.params['id'] as string);
      res.json(status);
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  },

  async reprocess(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await documentService.reprocess(req.params['id'] as string);
      res.status(202).json(doc);
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message?.includes('currently being processed')) {
        res.status(409).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
};