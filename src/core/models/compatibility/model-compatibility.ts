import { DiscoveredModel } from "../discovery/types";

export type HardwareFitLevel = 'likely' | 'warning' | 'insufficient' | 'unknown';
export type RuntimeCompatibilityLevel = 'supported' | 'conversion-required' | 'unsupported' | 'not-configured';

export interface ModelCompatibilityReport {
  score: number; // 0 to 1
  summary: string;
  canRunLocally: boolean;
  requiresConversion: boolean;
  hardwareFit: HardwareFitLevel;
  runtimeCompatibility: RuntimeCompatibilityLevel;
  warnings: string[];
  nextAction: string;
}

export class ModelCompatibilityScorer {
  static analyze(model: DiscoveredModel): ModelCompatibilityReport {
    const warnings: string[] = [];
    let score = 0.5;
    let hardwareFit: HardwareFitLevel = 'likely';
    let runtimeCompatibility: RuntimeCompatibilityLevel = 'supported';
    let canRunLocally = true;
    let requiresConversion = false;

    const mainFile = model.files[0];
    if (!mainFile) {
      return this.emptyReport("No files found in model.");
    }

    // 1. Format Check
    if (mainFile.format === 'gguf') {
      score += 0.3;
    } else if (mainFile.format === 'safetensors') {
      score -= 0.2;
      requiresConversion = true;
      runtimeCompatibility = 'conversion-required';
      warnings.push("Safetensors models require conversion to GGUF for local text runtime.");
    } else {
      score -= 0.4;
      canRunLocally = false;
      runtimeCompatibility = 'unsupported';
      warnings.push(`Format ${mainFile.format} is not supported by current runtimes.`);
    }

    // 2. Quantization Check
    if (mainFile.quantization && mainFile.quantization !== 'unknown') {
      if (mainFile.quantization.startsWith('Q4') || mainFile.quantization.startsWith('Q5')) {
        score += 0.1;
      } else if (mainFile.quantization.startsWith('Q8') || mainFile.quantization === 'F16') {
        score -= 0.1;
        hardwareFit = 'warning';
        warnings.push("High precision model may require significant RAM/VRAM.");
      }
    }

    // 3. Size Check
    if (mainFile.parameterSize && mainFile.parameterSize !== 'unknown') {
      const sizeNum = parseFloat(mainFile.parameterSize);
      if (sizeNum > 30) {
        score -= 0.2;
        hardwareFit = 'warning';
        warnings.push("Large model detected. Expect high latency on consumer hardware.");
      }
      if (sizeNum > 70) {
        hardwareFit = 'insufficient';
        warnings.push("Very large model. Likely exceeds consumer RAM limits.");
      }
    }

    // Finalize score
    score = Math.max(0, Math.min(1, score));

    return {
      score,
      summary: score > 0.7 ? "High compatibility for local execution." : "Medium compatibility. Check warnings.",
      canRunLocally,
      requiresConversion,
      hardwareFit,
      runtimeCompatibility,
      warnings,
      nextAction: requiresConversion ? "Convert to GGUF" : "Download and Load"
    };
  }

  private static emptyReport(reason: string): ModelCompatibilityReport {
    return {
      score: 0,
      summary: reason,
      canRunLocally: false,
      requiresConversion: false,
      hardwareFit: 'unknown',
      runtimeCompatibility: 'unknown' as any,
      warnings: [reason],
      nextAction: "None"
    };
  }
}
