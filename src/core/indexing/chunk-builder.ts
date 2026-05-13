import { ChunkRecord } from "./index-types";

export interface ChunkBuilderOptions {
  maxChunkChars: number;
}

export class WorkspaceChunkBuilder {
  private maxChunkChars: number;

  constructor(options: ChunkBuilderOptions) {
    this.maxChunkChars = options.maxChunkChars;
  }

  public buildChunks(fileId: string, content: string): ChunkRecord[] {
    const chunks: ChunkRecord[] = [];
    const lines = content.split('\n');

    let currentChunkText = '';
    let startLine = 1;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Trim very long lines safely
      const safeLine = line.length > this.maxChunkChars ? line.substring(0, this.maxChunkChars) + '...[TRUNCATED]' : line;

      if ((currentChunkText.length + safeLine.length + 1) > this.maxChunkChars && currentChunkText.length > 0) {
        // Push current chunk
        chunks.push({
          chunkId: `${fileId}-chunk-${chunkIndex}`,
          fileId: fileId,
          chunkIndex: chunkIndex,
          textPreview: currentChunkText.trim(),
          startLine: startLine,
          endLine: i,
        });

        chunkIndex++;
        currentChunkText = safeLine + '\n';
        startLine = i + 1;
      } else {
        currentChunkText += safeLine + '\n';
      }
    }

    if (currentChunkText.trim().length > 0) {
      chunks.push({
        chunkId: `${fileId}-chunk-${chunkIndex}`,
        fileId: fileId,
        chunkIndex: chunkIndex,
        textPreview: currentChunkText.trim(),
        startLine: startLine,
        endLine: lines.length,
      });
    }

    return chunks;
  }
}
