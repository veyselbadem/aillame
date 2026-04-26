// @ts-ignore
import { parseEpub } from '@lingo-reader/epub-parser';

export async function extractEpubText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const { chapters } = await parseEpub(arrayBuffer);
  // chapters: { title: string, content: string }[]
  return chapters.map((ch: any) => ch.content).join('\n');
}
