import { readFile } from 'fs/promises';

export async function extractText(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return content.trim();
}