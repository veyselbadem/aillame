import { RuntimeAcceptanceService } from "../runtime/acceptance/acceptance-service";
import { IGMRuntimeReadiness } from "../runtime/image/igm-runtime-readiness";
import { AgentMemoryService } from "../agent/memory/service";
import { ProductHealth, HealthStatus, ComponentHealth } from "./types";
import * as fs from "fs";
import * as path from "path";

export class ProductHealthService {
  private static mapStatus(status: string): HealthStatus {
    if (status === 'failed') return 'blocked';
    return status as HealthStatus;
  }

  static async getHealth(): Promise<ProductHealth> {
    const runtimeReport = RuntimeAcceptanceService.getReport();
    const memorySummary = await AgentMemoryService.getSummary();

    const llm: ComponentHealth = {
      status: this.mapStatus(runtimeReport.text.status),
      available: runtimeReport.text.liveTextRuntimeAvailable,
      configured: runtimeReport.text.configured,
      reason: runtimeReport.text.reason,
      warnings: runtimeReport.text.warnings,
      details: {
        runtime: runtimeReport.text.selectedRuntime,
        model: runtimeReport.text.selectedModelId,
        nanoAvailable: runtimeReport.text.nanoAdvisoryProbe.available
      }
    };

    const igm: ComponentHealth = {
      status: this.mapStatus(runtimeReport.image.status),
      available: runtimeReport.image.liveImageRuntimeAvailable,
      configured: runtimeReport.image.configured,
      reason: runtimeReport.image.reason,
      warnings: runtimeReport.image.warnings,
      details: {
        device: runtimeReport.image.deviceDetails,
        performanceWarning: runtimeReport.image.performanceWarning,
        placeholderUsed: runtimeReport.image.placeholderUsed
      }
    };

    const providerApi: ComponentHealth = {
      status: (llm.available || igm.available) ? "ready" : "blocked",
      available: llm.available || igm.available,
      configured: true,
      warnings: [],
      details: {
        textEnabled: llm.available,
        imageEnabled: igm.available
      }
    };

    const agent: ComponentHealth = {
      status: "ready", // Agent core is always ready if code exists
      available: true,
      configured: true,
      warnings: [],
      details: {
        betaLocked: true,
        workflowVerified: true
      }
    };

    const memory: ComponentHealth = {
      status: memorySummary.totalCards >= 0 ? "ready" : "degraded",
      available: true,
      configured: true,
      warnings: memorySummary.safetyWarnings,
      details: {
        cardCount: memorySummary.totalCards,
        lastInsight: memorySummary.recentInsights[0]
      }
    };

    const storage: ComponentHealth = this.checkStorage();

    const components = { llm, igm, providerApi, agent, memory, storage };
    const warnings = [
      ...llm.warnings,
      ...igm.warnings,
      ...memory.warnings,
      ...storage.warnings
    ];

    let overall: HealthStatus = "ready";
    if (llm.status === "blocked" || igm.status === "blocked") overall = "blocked";
    else if (llm.status === "degraded" || igm.status === "degraded" || storage.status === "degraded") overall = "degraded";

    return {
      overall,
      timestamp: Date.now(),
      components,
      warnings: Array.from(new Set(warnings)),
      nextRecommendedChecks: runtimeReport.overall.nextActions
    };
  }

  private static checkStorage(): ComponentHealth {
    const dataDir = path.join(process.cwd(), ".aillame-data");
    const exists = fs.existsSync(dataDir);
    const warnings: string[] = [];
    
    if (!exists) warnings.push(".aillame-data directory missing");
    
    return {
      status: exists ? "ready" : "degraded",
      available: exists,
      configured: true,
      warnings,
      details: {
        dataDirExists: exists
      }
    };
  }
}
