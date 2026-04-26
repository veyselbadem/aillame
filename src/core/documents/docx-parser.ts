import * as mammoth from 'mammoth';

export async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.convertToHtml({ arrayBuffer });
  // HTML'den düz metin çıkar
  return value.replace(/<[^>]+>/g, ' ');
}

export async function extractTxtText(file: File): Promise<string> {
  return await file.text();
}
