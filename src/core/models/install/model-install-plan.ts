import { DiscoveredModel, DiscoveredModelFile } from "../discovery/types";
import { ModelCompatibilityReport } from "../compatibility/model-compatibility";

export interface ModelInstallPlan {
  modelId: string;
  selectedFile: string;
  format: string;
  estimatedSizeBytes?: number;
  targetDirectory: string;
  license?: string;
  compatibility: ModelCompatibilityReport;
  diskSpaceCheck: 'ok' | 'warning' | 'insufficient' | 'unknown';
  approvalRequired: boolean;
  risks: string[];
  nextSteps: string[];
}

export class ModelInstallPlanService {
  createPlan(model: DiscoveredModel, file: DiscoveredModelFile, compatibility: ModelCompatibilityReport): ModelInstallPlan {
    const risks: string[] = [];
    if (compatibility.score < 0.4) risks.push("High risk of incompatibility or poor performance.");
    if (model.license && model.license.includes("non-commercial")) risks.push("Usage restricted to non-commercial purposes.");

    return {
      modelId: model.modelId,
      selectedFile: file.name,
      format: file.format,
      estimatedSizeBytes: file.sizeBytes,
      targetDirectory: ".aillame-data/models/local/",
      license: model.license,
      compatibility,
      diskSpaceCheck: 'unknown',
      approvalRequired: true,
      risks,
      nextSteps: [
        "Review license and hardware requirements",
        "Obtain user approval via Admin Dashboard",
        "Download GGUF shard to local storage",
        "Verify checksum and register in Local Model Library"
      ]
    };
  }
}

export const modelInstallPlanService = new ModelInstallPlanService();
