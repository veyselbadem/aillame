import { DiscoveredModel, ModelSourceProvider } from "../discovery/types";
import { ModelCompatibilityReport } from "../compatibility/model-compatibility";

export type ModelUpdateStatus = 'up-to-date' | 'update-available' | 'checking' | 'failed' | 'not-configured';

export interface ModelWatchlistEntry {
  watchId: string;
  modelId: string;
  sourceProvider: ModelSourceProvider;
  lastSeenRevision: string;
  lastModified: number;
  installedVersion?: string;
  installedFile?: string;
  updateAvailable: boolean;
  updateNotes?: string;
  compatibility: ModelCompatibilityReport;
  createdAt: number;
  updatedAt: number;
}

export class ModelWatchlist {
  private entries: Map<string, ModelWatchlistEntry> = new Map();

  add(model: DiscoveredModel, compatibility: ModelCompatibilityReport): ModelWatchlistEntry {
    const entry: ModelWatchlistEntry = {
      watchId: `watch-${model.modelId}`,
      modelId: model.modelId,
      sourceProvider: model.provider,
      lastSeenRevision: model.metadata.revision || 'latest',
      lastModified: model.updatedAt,
      updateAvailable: false,
      compatibility,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.entries.set(entry.watchId, entry);
    return entry;
  }

  checkUpdates(watchId: string, latestInfo: DiscoveredModel): { updateAvailable: boolean; notes?: string } {
    const entry = this.entries.get(watchId);
    if (!entry) return { updateAvailable: false };

    const isNewer = latestInfo.updatedAt > entry.lastModified;
    const isDifferentRevision = latestInfo.metadata.revision && latestInfo.metadata.revision !== entry.lastSeenRevision;

    if (isNewer || isDifferentRevision) {
      entry.updateAvailable = true;
      entry.updatedAt = Date.now();
      entry.updateNotes = isNewer ? `New version released on ${new Date(latestInfo.updatedAt).toLocaleDateString()}` : "Metadata update detected.";
      return { updateAvailable: true, notes: entry.updateNotes };
    }

    return { updateAvailable: false };
  }

  getEntries(): ModelWatchlistEntry[] {
    return Array.from(this.entries.values());
  }
}

export const modelWatchlist = new ModelWatchlist();
