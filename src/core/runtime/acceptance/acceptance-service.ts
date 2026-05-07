import { IGMRuntimeReadiness } from "../image/igm-runtime-readiness";
import { probeAillameTextRuntime } from "../../engine/rust-core";

export type RuntimeAcceptanceStatus = 'ready' | 'degraded' | 'not-configured' | 'failed';

export interface RuntimeAcceptanceReport {
  text: {
    finalAcceptanceReady: boolean;
    liveTextRuntimeAvailable: boolean;
    status: RuntimeAcceptanceStatus;
    reason?: string;
  };
  image: {
    finalAcceptanceReady: boolean;
    liveImageRuntimeAvailable: boolean;
    status: RuntimeAcceptanceStatus;
    reason?: string;
  };
  overall: {
    finalAcceptanceReady: boolean;
    status: RuntimeAcceptanceStatus;
    blockers: string[];
  };
  timestamp: number;
}

export class RuntimeAcceptanceService {
  static getReport(): RuntimeAcceptanceReport {
    const textProbe = probeAillameTextRuntime();
    const imageDiag = IGMRuntimeReadiness.getDiagnostics();

    const textReady = textProbe.success;
    const imageReady = imageDiag.finalAcceptanceReady;

    const blockers: string[] = [];
    if (!textReady) blockers.push("Local LLM (Nano) is not producing text. Check native module and checkpoint.");
    if (!imageReady) blockers.push("Local IGM (Diffusion) is not configured. Check AILLAME_IGM_* env variables.");

    return {
      text: {
        finalAcceptanceReady: textReady,
        liveTextRuntimeAvailable: textReady,
        status: textReady ? 'ready' : (textProbe.checkpoint.checkpointPathExists ? 'degraded' : 'not-configured'),
        reason: textProbe.reason
      },
      image: {
        finalAcceptanceReady: imageReady,
        liveImageRuntimeAvailable: imageReady,
        status: imageReady ? 'ready' : (imageDiag.enabled ? 'degraded' : 'not-configured'),
        reason: imageDiag.missingConfig.join(", ")
      },
      overall: {
        finalAcceptanceReady: textReady && imageReady,
        status: (textReady && imageReady) ? 'ready' : 'degraded',
        blockers
      },
      timestamp: Date.now()
    };
  }
}
