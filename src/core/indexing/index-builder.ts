import fs from "fs";
import path from "path";
import { IndexingPolicy } from "./index-types";
import { DEFAULT_INDEXING_POLICY, isFileIndexable, isDirectoryIndexable } from "./index-policy";
import { generateSafeFileId, generateSafeDisplayName } from "./index-sanitizer";
import { WorkspaceChunkBuilder } from "./chunk-builder";
import { WorkspaceIndexSession } from "./index-session";

export class WorkspaceIndexBuilder {
  private policy: IndexingPolicy;
  private chunkBuilder: WorkspaceChunkBuilder;

  constructor(policy: IndexingPolicy = DEFAULT_INDEXING_POLICY) {
    this.policy = policy;
    this.chunkBuilder = new WorkspaceChunkBuilder({ maxChunkChars: policy.maxChunkChars });
  }

  public async buildIndex(workspaceRoot: string, session: WorkspaceIndexSession): Promise<void> {
    session.reset();
    session.status = "building";

    try {
      await this.traverseDirectory(workspaceRoot, workspaceRoot, session);
      session.status = "ready";
      session.lastBuiltAt = Date.now();
    } catch (error: any) {
      session.status = "failed";
      session.addWarning("Index build failed: " + (error.message || "Unknown error"));
    }
  }

  private async traverseDirectory(currentPath: string, rootPath: string, session: WorkspaceIndexSession) {
    if (session.stats.indexedFiles >= this.policy.maxFiles) {
      session.addWarning(`Maximum file limit (${this.policy.maxFiles}) reached. Skipping further files.`);
      return;
    }
    if (session.stats.totalBytesRead >= this.policy.maxTotalBytes) {
      session.addWarning(`Maximum total size limit reached. Skipping further files.`);
      return;
    }

    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch (err) {
      session.addWarning(`Failed to read directory. Skipping.`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (isDirectoryIndexable(entry.name, this.policy)) {
          await this.traverseDirectory(fullPath, rootPath, session);
        }
      } else if (entry.isFile()) {
        await this.processFile(fullPath, rootPath, entry.name, session);
      }
    }
  }

  private async processFile(fullPath: string, rootPath: string, filename: string, session: WorkspaceIndexSession) {
    if (session.stats.indexedFiles >= this.policy.maxFiles || session.stats.totalBytesRead >= this.policy.maxTotalBytes) {
      return;
    }

    let stats: fs.Stats;
    try {
      stats = await fs.promises.stat(fullPath);
    } catch (err) {
      session.addWarning(`Failed to stat file: ${generateSafeDisplayName(filename)}`);
      return;
    }

    const indexability = isFileIndexable(filename, stats.size, this.policy);
    
    const fileId = generateSafeFileId(fullPath);
    const displayName = generateSafeDisplayName(fullPath.replace(rootPath, ""));
    const extension = filename.split('.').pop() || "";
    const rootLabel = "workspace"; // Simplified for now

    if (!indexability.indexable) {
      session.records.push({
        fileId,
        rootLabel,
        displayName,
        extension,
        sizeBytes: stats.size,
        chunkCount: 0,
        status: "skipped",
        skippedReason: indexability.reason,
      });
      session.stats.skippedFiles++;
      return;
    }

    try {
      // Read content
      const content = await fs.promises.readFile(fullPath, 'utf8');
      
      // Basic heuristic to avoid binary content
      if (content.indexOf('\0') !== -1) {
        session.records.push({
          fileId,
          rootLabel,
          displayName,
          extension,
          sizeBytes: stats.size,
          chunkCount: 0,
          status: "skipped",
          skippedReason: "binary_content",
        });
        session.stats.skippedFiles++;
        return;
      }

      // Build chunks
      const fileChunks = this.chunkBuilder.buildChunks(fileId, content);

      session.chunks.push(...fileChunks);
      session.records.push({
        fileId,
        rootLabel,
        displayName,
        extension,
        sizeBytes: stats.size,
        chunkCount: fileChunks.length,
        status: "indexed",
      });

      session.stats.indexedFiles++;
      session.stats.indexedChunks += fileChunks.length;
      session.stats.totalBytesRead += stats.size;

    } catch (err) {
      session.addWarning(`Failed to read file content: ${displayName}`);
      session.records.push({
        fileId,
        rootLabel,
        displayName,
        extension,
        sizeBytes: stats.size,
        chunkCount: 0,
        status: "failed",
        skippedReason: "io_error",
      });
      session.stats.skippedFiles++;
    }
  }
}
