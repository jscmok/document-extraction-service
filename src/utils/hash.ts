import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

export async function computeFileHash(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}