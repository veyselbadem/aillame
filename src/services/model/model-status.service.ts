/**
 * ModelStatusService
 * 
 * Amaç: Model durumlarını merkezi olarak yönetmek.
 * Faz 2'de temel durum takibi yapar.
 */

export type ModelStatus = 
  | 'registered' 
  | 'loading' 
  | 'ready' 
  | 'running' 
  | 'failed' 
  | 'missing' 
  | 'invalid';

export interface ModelStatusInfo {
  status: ModelStatus;
  lastUpdate: string;
  reason?: string;
}

export class ModelStatusService {
  private static statuses = new Map<string, ModelStatusInfo>();

  static setStatus(modelId: string, status: ModelStatus, reason?: string) {
    this.statuses.set(modelId, {
      status,
      lastUpdate: new Date().toISOString(),
      reason
    });
  }

  static getStatus(modelId: string): ModelStatusInfo {
    return this.statuses.get(modelId) || {
      status: 'registered',
      lastUpdate: new Date().toISOString()
    };
  }
}
