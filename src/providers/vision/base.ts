import type { VisionInput, VisionResult } from '@apptypes/vision';

export interface VisionProvider {
  /**
   * Görseli analiz eder ve sonuç döner.
   */
  analyze(input: VisionInput): Promise<VisionResult>;
}
