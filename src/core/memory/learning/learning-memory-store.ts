import * as fs from "fs";
import * as path from "path";
import { sanitizeLearningMemoryCreateInput } from "./learning-memory-sanitizer";
import { searchLearningMemoryEntries } from "./learning-memory-search";
import type {
  AillameLearningMemoryCreateInput,
  AillameLearningMemoryEntry,
  AillameLearningMemorySearchInput,
  AillameLearningMemorySearchResult,
  AillameLearningMemoryStoreMode,
} from "./learning-memory-types";

function makeId(seed: string, index: number): string {
  const normalized = seed.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `learn-${normalized || "entry"}-${index}`;
}

export class AillameLearningMemoryStore {
  private readonly entries: AillameLearningMemoryEntry[] = [];
  private readonly storagePath?: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath;
    this.load();
  }

  private load(): void {
    if (!this.storagePath || !fs.existsSync(this.storagePath)) return;
    try {
      const data = fs.readFileSync(this.storagePath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this.entries.push(...parsed);
      }
    } catch (error) {
      console.error(`[AillameLearningMemoryStore] Failed to load from ${this.storagePath}:`, error);
    }
  }

  private save(): void {
    if (!this.storagePath) return;
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(this.entries, null, 2), "utf-8");
    } catch (error) {
      console.error(`[AillameLearningMemoryStore] Failed to save to ${this.storagePath}:`, error);
    }
  }

  create(input: AillameLearningMemoryCreateInput): AillameLearningMemoryEntry {
    const sanitized = sanitizeLearningMemoryCreateInput(input);
    const now = new Date().toISOString();
    const entry: AillameLearningMemoryEntry = {
      ...sanitized,
      id: makeId(`${sanitized.projectId}-${sanitized.category}-${sanitized.title}`, this.entries.length + 1),
      createdAt: now,
      updatedAt: now,
    };

    this.entries.push(entry);
    this.save();
    return entry;
  }

  list(): AillameLearningMemoryEntry[] {
    return [...this.entries];
  }

  search(input: AillameLearningMemorySearchInput): AillameLearningMemorySearchResult {
    return searchLearningMemoryEntries(this.entries, input);
  }

  clear(): void {
    this.entries.length = 0;
    this.save();
  }
}

export function createLearningMemoryStore(storagePath?: string): AillameLearningMemoryStore {
  return new AillameLearningMemoryStore(storagePath);
}

const DEFAULT_MEMORY_PATH = path.join(".aillame", "memory", "learning-memory.json");

/**
 * Returns the desired store mode based on the AILLAME_MEMORY_STORE_MODE environment variable.
 * Defaults to "memory".
 */
export function getLearningMemoryStoreMode(): AillameLearningMemoryStoreMode {
  const envMode = process.env.AILLAME_MEMORY_STORE_MODE;
  if (envMode === "json-file") return "json-file";
  return "memory";
}

let defaultLearningMemoryStore: AillameLearningMemoryStore | undefined;

export function getDefaultLearningMemoryStore(): AillameLearningMemoryStore {
  if (!defaultLearningMemoryStore) {
    const mode = getLearningMemoryStoreMode();
    const storagePath = mode === "json-file" ? DEFAULT_MEMORY_PATH : undefined;
    defaultLearningMemoryStore = createLearningMemoryStore(storagePath);
  }
  return defaultLearningMemoryStore;
}


