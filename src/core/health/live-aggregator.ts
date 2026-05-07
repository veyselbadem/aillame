import { SystemHealth, HealthAggregator } from './aggregator';
import { ensureStorageRoot } from '../storage/file-store';
import { ProjectMemoryFileStore } from '../memory/project-memory-file-store';
import { VectorMemoryFileStore } from '../memory/vector/vector-memory-file-store';
import { AuditFileStore } from '../security/audit-file-store';
import { ApiKeyService } from '../security/api-key-service';

export class LiveHealthAggregator implements HealthAggregator {
  async getSystemHealth(): Promise<SystemHealth> {
    const storageDiag = ensureStorageRoot();
    
    let pmDiag;
    try {
      const pmStore = new ProjectMemoryFileStore();
      pmDiag = await pmStore.getDiagnostics();
    } catch (e) {
      pmDiag = { error: String(e) };
    }

    let vectorDiag;
    try {
      const vectorStore = new VectorMemoryFileStore();
      vectorDiag = vectorStore.getDiagnostics();
    } catch (e) {
      vectorDiag = { error: String(e) };
    }

    let auditDiag;
    try {
      const auditStore = new AuditFileStore();
      auditDiag = auditStore.getAuditDiagnostics();
    } catch (e) {
      auditDiag = { error: String(e) };
    }

    let apiKeyDiag;
    try {
      const apiKeyService = new ApiKeyService();
      apiKeyDiag = apiKeyService.getDiagnostics();
    } catch (e) {
      apiKeyDiag = { error: String(e) };
    }

    const isHealthy = storageDiag.isWritable;

    return {
      overallStatus: isHealthy ? "healthy" : "degraded",
      timestamp: Date.now(),
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      uptime: process.uptime(),
      components: {
        runtime: {
          name: "Local Text Runtime",
          status: "ready",
          diagnostics: { detail: "GGUF/WASM runtime wrapper ready" }
        },
        modelRegistry: {
          name: "Model Registry",
          status: "ready",
          diagnostics: { detail: "Local model library active" }
        },
        projectMemory: {
          name: "Project Memory",
          status: ('error' in pmDiag) ? "failed" : "ready",
          diagnostics: pmDiag
        },
        externalProvider: {
          name: "External Provider API",
          status: "ready",
          diagnostics: { detail: "v1 OpenAI-compatible gateway active" }
        },
        codeAgent: {
          name: "Code Agent",
          status: "ready",
          diagnostics: { detail: "Plan-only verifier active" }
        },
        imageWorkflow: {
          name: "Image Workflow",
          status: "not-configured"
        },
        vectorMemory: {
          name: "Vector Memory",
          status: ('error' in vectorDiag) ? "failed" : "ready",
          diagnostics: vectorDiag
        },
        nanoIntelligence: {
          name: "Nano Intelligence",
          status: "ready",
          diagnostics: { detail: "Safety & Learning loop active" }
        },
        security: {
          name: "Security & Audit",
          status: ('error' in auditDiag || 'error' in apiKeyDiag) ? "failed" : "ready",
          diagnostics: { 
            audit: auditDiag, 
            storage: storageDiag,
            apiKeys: apiKeyDiag,
            authRequired: process.env.NODE_ENV === 'production' || process.env.AILLAME_EXTERNAL_API_AUTH_REQUIRED === 'true'
          }
        },
        desktopReadiness: {
          name: "Desktop Readiness",
          status: "planned"
        }
      }
    };
  }
}

export const liveHealthAggregator = new LiveHealthAggregator();
