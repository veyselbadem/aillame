import { IndexingResult, IndexingPolicy } from "./index-types";
import { DEFAULT_INDEXING_POLICY } from "./index-policy";
import { SafeWorkspaceDiscovery } from "./safe-discovery";

export * from "./index-types";
export * from "./index-policy";
export * from "./index-sanitizer";
export * from "./safe-discovery";
export * from "./search-types";
export * from "./search-policy";
export * from "./search-sanitizer";
export * from "./search-engine";
export * from "./retrieval";
export * from "./chunk-builder";
export * from "./index-session";
export * from "./index-builder";
export * from "./staged-context-types";
export * from "./staged-context-sanitizer";
export * from "./staged-context-state";
export * from "./manual-context-attach-types";
export * from "./manual-context-attach";
export * from "./manual-context-boundary";

export class AillameWorkspaceIndexer {
  private policy: IndexingPolicy;
  private discovery: SafeWorkspaceDiscovery;

  constructor(policy: IndexingPolicy = DEFAULT_INDEXING_POLICY) {
    this.policy = policy;
    this.discovery = new SafeWorkspaceDiscovery(policy);
  }

  /**
   * Safe entry point for workspace indexing.
   * Phase 22: Only supports dry-run/discovery.
   */
  async discoverWorkspace(rootLabel: string): Promise<IndexingResult> {
    return this.discovery.dryRun(rootLabel);
  }

  /**
   * Chunking contract implementation skeleton.
   */
  createChunks(fileId: string, content: string): any[] {
    // Phase 22: Content processing is skeleton only
    console.log(`[Indexer] Chunking requested for file: ${fileId}`);
    return [];
  }
}
