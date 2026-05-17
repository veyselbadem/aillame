import { VisualSpec } from "./svg.types";
import { GeometrySvgGenerator } from "./geometry-svg-generator.service";

export interface SvgImageResult {
  type: "svg" | "placeholder";
  data: string;
  spec: VisualSpec;
  prompt: string;
  warnings?: string[];
}

export class BademakademiSvgImageRuntimeAdapter {
  static async generate(spec: VisualSpec): Promise<SvgImageResult> {
    if (spec.kind === "geometry_diagram") {
      const result = GeometrySvgGenerator.generate(spec);
      if (result.ok && result.svg) {
        return {
          type: "svg",
          data: result.svg,
          spec,
          prompt: "Deterministik SVG geometri diyagramı üretildi.",
          warnings: result.warnings
        };
      }
    }

    // Fallback to placeholder if kind is unsupported or generation failed
    return {
      type: "placeholder",
      data: "",
      spec,
      prompt: `Görsel üretilemedi (Kind: ${spec.kind}). Placeholder kullanılıyor.`,
      warnings: ["SVG üretimi desteklenmeyen diyagram türü."]
    };
  }
}
