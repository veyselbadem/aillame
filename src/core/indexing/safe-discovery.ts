import { IndexRecord, IndexingResult, IndexingPolicy } from "./index-types";
import { DEFAULT_INDEXING_POLICY, isFileIndexable, isDirectoryIndexable } from "./index-policy";
import { generateSafeFileId, generateSafeDisplayName } from "./index-sanitizer";

export class SafeWorkspaceDiscovery {
  private policy: IndexingPolicy;

  constructor(policy: IndexingPolicy = DEFAULT_INDEXING_POLICY) {
    this.policy = policy;
  }

  /**
   * Performs a dry-run discovery of indexable files in the workspace.
   * Phase 22: Skeleton implementation that simulates discovery.
   */
  async dryRun(rootLabel: string): Promise<IndexingResult> {
    // In a real implementation, this would walk the filesystem.
    // For Phase 22, we return a simulated result to verify the contract.
    
    const simulatedFiles = [
      { path: "src/main.ts", size: 1024 },
      { path: "src/core/indexing/index.ts", size: 2048 },
      { path: "README.md", size: 512 },
      { path: ".env", size: 100 },
      { path: "model.gguf", size: 1024 * 1024 * 500 },
    ];

    const records: IndexRecord[] = simulatedFiles.map(file => {
      const filename = generateSafeDisplayName(file.path);
      const indexability = isFileIndexable(filename, file.size, this.policy);
      const isDirSafe = file.path.split('/').every(part => isDirectoryIndexable(part, this.policy));

      const status = (indexability.indexable && isDirSafe) ? "indexed" : "skipped";
      const reason = !isDirSafe ? "denylisted_directory" : indexability.reason;

      return {
        fileId: generateSafeFileId(file.path),
        rootLabel,
        displayName: filename,
        extension: filename.split('.').pop() || "",
        sizeBytes: file.size,
        chunkCount: status === "indexed" ? Math.ceil(file.size / this.policy.maxChunkChars) : 0,
        status,
        skippedReason: reason,
      };
    });

    const indexed = records.filter(r => r.status === "indexed");

    return {
      totalFiles: records.length,
      indexedFiles: indexed.length,
      skippedFiles: records.length - indexed.length,
      totalBytes: indexed.reduce((sum, r) => sum + r.sizeBytes, 0),
      records,
    };
  }
}
