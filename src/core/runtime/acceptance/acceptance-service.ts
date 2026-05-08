import * as fs from "fs";
import * as path from "path";
import { IGMRuntimeReadiness } from "../image/igm-runtime-readiness";
import { probeAillameTextRuntime } from "../../engine/rust-core";
import { checkGgufWorkerReadiness } from "../text/worker/gguf/gguf-worker-readiness";

type RuntimeAcceptanceKind = "foundation" | "configured" | "attempted" | "succeeded";

export type RuntimeAcceptanceStatus = 'ready' | 'degraded' | 'not-configured' | 'failed';

export interface RuntimeAcceptanceDetails {
  configured: boolean;
  attempted: boolean;
  succeeded: boolean;
  finalAcceptanceReady: boolean;
  phase: RuntimeAcceptanceKind;
  missingConfig: string[];
  missingFiles: string[];
  missingWorker: string[];
  warnings: string[];
  nextActions: string[];
}

export interface RuntimeAcceptanceReport {
  text: {
    finalAcceptanceReady: boolean;
    liveTextRuntimeAvailable: boolean;
    configured: boolean;
    attempted: boolean;
    succeeded: boolean;
    selectedRuntime: string;
    selectedModelId?: string;
    responseLength: number;
    outputPreview?: string;
    fallbackUsed: boolean;
    degraded: boolean;
    missingConfig: string[];
    missingFiles: string[];
    missingWorker: string[];
    warnings: string[];
    nextActions: string[];
    status: RuntimeAcceptanceStatus;
    reason?: string;
    nanoAdvisoryProbe: {
      available: boolean;
      generatedTokenCount: number;
      decodedLength: number;
      reason?: string;
    };
  };
  image: {
    finalAcceptanceReady: boolean;
    liveImageRuntimeAvailable: boolean;
    configured: boolean;
    attempted: boolean;
    succeeded: boolean;
    jobId?: string;
    assetId?: string;
    outputPathSanitized?: string;
    mimeType?: string;
    fileExists: boolean;
    placeholderUsed: boolean;
    degraded: boolean;
    missingConfig: string[];
    missingFiles: string[];
    missingWorker: string[];
    warnings: string[];
    nextActions: string[];
    status: RuntimeAcceptanceStatus;
    reason?: string;
    deviceDetails?: string;
    deviceReason?: string;
    performanceWarning?: boolean;
  };
  overall: {
    finalAcceptanceReady: boolean;
    status: RuntimeAcceptanceStatus;
    blockers: string[];
    nextActions: string[];
  };
  timestamp: number;
}

export class RuntimeAcceptanceService {
  static getReport(): RuntimeAcceptanceReport {
    const nanoProbe = probeAillameTextRuntime();
    const ggufReadiness = checkGgufWorkerReadiness();
    const imageDiag = IGMRuntimeReadiness.getDiagnostics();

    const textMissingConfig: string[] = [];
    const textMissingFiles: string[] = [];
    const textMissingWorker: string[] = [];
    const textWarnings: string[] = [...ggufReadiness.warnings];
    const textNextActions: string[] = [];

    const ggufRuntimeEnabled = process.env.AILLAME_GGUF_RUNTIME_ENABLED === "true"
      || process.env.AILLAME_GGUF_WORKER_ENABLED === "true";
    const ggufRuntimeBinary = process.env.AILLAME_GGUF_RUNTIME_BINARY;
    const ggufModelPath = process.env.AILLAME_GGUF_MODEL_PATH;
    const ggufModelDir = process.env.AILLAME_GGUF_MODEL_DIR;
    const ggufActiveModel = process.env.AILLAME_GGUF_ACTIVE_MODEL;
    const modelConfigured = Boolean(ggufModelPath || (ggufModelDir && ggufActiveModel));

    if (!ggufRuntimeEnabled) textMissingConfig.push("AILLAME_GGUF_RUNTIME_ENABLED is false");
    if (!ggufRuntimeBinary) textMissingConfig.push("AILLAME_GGUF_RUNTIME_BINARY is not set");
    if (!modelConfigured) {
      textMissingConfig.push("AILLAME_GGUF_MODEL_PATH or AILLAME_GGUF_MODEL_DIR + AILLAME_GGUF_ACTIVE_MODEL is not set");
    }
    if (ggufReadiness.state === "model-file-missing") {
      textMissingFiles.push("Configured GGUF model file was not found");
    }
    if (!ggufReadiness.canGenerate) {
      textMissingWorker.push("Aillame-controlled GGUF text generation worker is not implemented/configured.");
    }

    if (!ggufRuntimeEnabled) textNextActions.push("Enable the GGUF text runtime with AILLAME_GGUF_RUNTIME_ENABLED=true when a local worker is configured.");
    if (!ggufRuntimeBinary) textNextActions.push("Set AILLAME_GGUF_RUNTIME_BINARY to the local Aillame-controlled text worker binary.");
    if (!modelConfigured) textNextActions.push("Set a local GGUF model using AILLAME_GGUF_MODEL_PATH or AILLAME_GGUF_MODEL_DIR plus AILLAME_GGUF_ACTIVE_MODEL.");
    if (!ggufReadiness.canGenerate) textNextActions.push("Wire a real GGUF generation adapter; Nano advisory output is not final LLM acceptance.");

    const textConfigured = ggufRuntimeEnabled
      && Boolean(ggufRuntimeBinary)
      && modelConfigured
      && ggufReadiness.modelPathExists
      && ggufReadiness.allowedByPathPolicy;
    
    // Check for success marker or live probe
    const textDataFile = path.join(process.cwd(), '.aillame-data', 'text-runtime-acceptance.json');
    let textSucceeded = false;
    let textAttempted = false;
    let responseLength = 0;
    let outputPreview = "";

    if (fs.existsSync(textDataFile)) {
      try {
        const marker = JSON.parse(fs.readFileSync(textDataFile, 'utf8'));
        textAttempted = true;
        textSucceeded = marker.success;
        responseLength = marker.responseLength || 0;
        outputPreview = marker.outputPreview || "";
      } catch {}
    }

    const textReady = textConfigured && ggufReadiness.canGenerate && textAttempted && textSucceeded;

    const imageReady = imageDiag.finalAcceptanceReady;

    const blockers: string[] = [];
    if (!textReady) blockers.push("Local LLM is not producing real text through an Aillame-controlled GGUF/text worker.");
    if (!imageReady) blockers.push("Local IGM is not producing a real image through an Aillame-controlled diffusion worker.");
    const nextActions = [...textNextActions, ...imageDiag.nextActions];

    const textReason = textReady
      ? "REAL_LLM_GENERATION_SUCCEEDED"
      : textMissingConfig[0] ?? textMissingFiles[0] ?? textMissingWorker[0] ?? "REAL_LLM_GENERATION_NOT_ATTEMPTED";

    return {
      text: {
        finalAcceptanceReady: textReady,
        liveTextRuntimeAvailable: textReady,
        configured: textConfigured,
        attempted: textAttempted,
        succeeded: textSucceeded,
        selectedRuntime: "gguf-text-runtime",
        selectedModelId: ggufActiveModel ?? ggufModelPath ?? "unconfigured",
        responseLength,
        outputPreview,
        fallbackUsed: !textReady,
        degraded: !textReady,
        missingConfig: textMissingConfig,
        missingFiles: textMissingFiles,
        missingWorker: textMissingWorker,
        warnings: textWarnings,
        nextActions: textNextActions,
        status: textReady ? 'ready' : (textConfigured ? 'degraded' : 'not-configured'),
        reason: textReason,
        nanoAdvisoryProbe: {
          available: nanoProbe.success,
          generatedTokenCount: nanoProbe.generatedTokenCount,
          decodedLength: nanoProbe.decodedLength,
          reason: nanoProbe.reason,
        },
      },
      image: {
        finalAcceptanceReady: imageReady,
        liveImageRuntimeAvailable: imageReady,
        configured: imageDiag.configured,
        attempted: imageDiag.attempted,
        succeeded: imageDiag.succeeded,
        fileExists: imageDiag.succeeded,
        placeholderUsed: !imageDiag.succeeded,
        degraded: !imageReady,
        missingConfig: imageDiag.missingConfig,
        missingFiles: imageDiag.missingFiles,
        missingWorker: imageDiag.missingWorker,
        warnings: imageDiag.warnings,
        nextActions: imageDiag.nextActions,
        status: imageReady ? 'ready' : (imageDiag.configured ? 'degraded' : 'not-configured'),
        reason: imageDiag.reason,
        deviceDetails: imageDiag.deviceDetails,
        deviceReason: imageDiag.deviceReason,
        performanceWarning: imageDiag.performanceWarning
      },
      overall: {
        finalAcceptanceReady: textReady && imageReady,
        status: (textReady && imageReady) ? 'ready' : 'degraded',
        blockers,
        nextActions
      },
      timestamp: Date.now()
    };
  }
}
