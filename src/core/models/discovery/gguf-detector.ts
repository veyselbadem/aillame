import { ModelFormat, DiscoveredModelFile } from "./types";

export class GgufDetector {
  static detectGgufFile(filename: string): DiscoveredModelFile | null {
    if (!filename.toLowerCase().endsWith('.gguf')) {
      return null;
    }

    const quantization = this.parseQuantization(filename);
    const parameterSize = this.parseParameterSize(filename);

    return {
      name: filename,
      format: 'gguf',
      quantization,
      parameterSize
    };
  }

  static parseQuantization(filename: string): string {
    const quants = [
      'Q2_K', 'Q3_K_L', 'Q3_K_M', 'Q3_K_S', 'Q4_0', 'Q4_1', 'Q4_K_M', 'Q4_K_S',
      'Q5_0', 'Q5_1', 'Q5_K_M', 'Q5_K_S', 'Q6_K', 'Q8_0', 'F16', 'F32'
    ];
    
    const upper = filename.toUpperCase();
    for (const q of quants) {
      if (upper.includes(q)) return q;
    }
    
    // Fallback regex for Qx_x_x pattern
    const match = filename.match(/Q[0-9]_[K0-9A-Z_]+/i);
    return match ? match[0].toUpperCase() : 'unknown';
  }

  static parseParameterSize(filename: string): string {
    // Look for patterns like 7B, 1.5B, 70B, etc.
    const match = filename.match(/([0-9.]+[BbMm])/);
    return match ? match[1].toUpperCase() : 'unknown';
  }

  static estimateSize(parameterSize: string, quantization: string): number {
    // Very rough estimate in bytes
    const params = parseFloat(parameterSize) || 7;
    const mult = quantization.startsWith('Q4') ? 0.6 : quantization.startsWith('Q8') ? 1.0 : 0.8;
    return params * mult * 1024 * 1024 * 1024;
  }
}
