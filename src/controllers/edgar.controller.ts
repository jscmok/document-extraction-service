import { Request, Response, NextFunction } from 'express';
import { fetchAndSaveFiling } from '../services/edgar.service';
import { documentService } from '../services/document.service';
import { schemaRepository } from '../repositories/schema.repository';
import { computeFileHash } from '../utils/hash';

export const edgarController = {
  async ingest(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticker } = req.params;

      if (!ticker || ticker.length > 5) {
        res.status(400).json({ error: 'Invalid ticker symbol' });
        return;
      }

      // Find the sec-10k schema automatically
      const schema = await schemaRepository.findByName('sec-10k');
      if (!schema) {
        res.status(400).json({
          error: 'sec-10k schema not found — create it first via POST /schemas',
        });
        return;
      }

      // Fetch filing from EDGAR and save to disk
      const filing = await fetchAndSaveFiling(ticker);

      // Compute hash for idempotency
      const contentHash = await computeFileHash(filing.storagePath);

      // Use existing document upload pipeline — same flow as a regular upload
      const document = await documentService.uploadFromPath({
        originalFileName: filing.originalFileName,
        mimeType: filing.mimeType,
        storagePath: filing.storagePath,
        contentHash,
        schemaId: schema.id,
      });

      res.status(202).json({
        message: `10-K filing for ${filing.ticker} queued for extraction`,
        filingDate: filing.filingDate,
        document,
      });
    } catch (err: any) {
      if (err.message?.includes('not found in SEC EDGAR')) {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
};