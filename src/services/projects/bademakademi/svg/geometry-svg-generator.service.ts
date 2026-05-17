import { VisualSpec, SvgGenerationOptions, SvgGenerationResult } from "./svg.types";
import { SvgSafetyService } from "./svg-safety.service";

export class GeometrySvgGenerator {
  private static DEFAULT_WIDTH = 640;
  private static DEFAULT_HEIGHT = 360;

  static generate(spec: VisualSpec, options: SvgGenerationOptions = {}): SvgGenerationResult {
    const width = options.width || spec.width || this.DEFAULT_WIDTH;
    const height = options.height || spec.height || this.DEFAULT_HEIGHT;
    const warnings: string[] = [];

    if (spec.kind !== "geometry_diagram") {
      return { ok: false, width, height, warnings: ["Unsupported visual spec kind"], error: { code: "SVG_UNSUPPORTED_KIND", message: "Only geometry_diagram is supported." } };
    }

    const items = spec.items || [];
    if (items.length === 0) {
      warnings.push("No items provided in visual spec.");
    }

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`;
    svg += `<rect width="100%" height="100%" fill="#ffffff" />`; // Background

    // 2x2 Grid Layout
    const cellWidth = width / 2;
    const cellHeight = height / 2;

    items.forEach((item, index) => {
      if (index >= 4) return; // Limit to 4 items for 2x2 grid

      const col = index % 2;
      const row = Math.floor(index / 2);
      const centerX = col * cellWidth + cellWidth / 2;
      const centerY = row * cellHeight + cellHeight / 2;

      svg += this.drawItem(item, centerX, centerY, cellWidth, cellHeight, warnings);
    });

    svg += `</svg>`;

    if (!SvgSafetyService.isSafe(svg)) {
      return { ok: false, width, height, warnings, error: { code: "SVG_SAFETY_VALIDATION_FAILED", message: "Produced SVG failed safety check." } };
    }

    return { ok: true, svg, width, height, warnings };
  }

  private static drawItem(item: any, cx: number, cy: number, cw: number, ch: number, warnings: string[]): string {
    const label = SvgSafetyService.escapeText(item.label);
    const color = SvgSafetyService.sanitizeColor(item.color, "#333333");
    const shapeSize = Math.min(cw, ch) * 0.5;
    let shapeContent = "";

    switch (item.shape) {
      case "square":
        shapeContent = `<rect x="${cx - shapeSize / 2}" y="${cy - shapeSize / 2}" width="${shapeSize}" height="${shapeSize}" fill="none" stroke="${color}" stroke-width="2" />`;
        break;
      case "circle":
        shapeContent = `<circle cx="${cx}" cy="${cy}" r="${shapeSize / 2}" fill="none" stroke="${color}" stroke-width="2" />`;
        break;
      case "triangle":
        const p1 = `${cx},${cy - shapeSize / 2}`;
        const p2 = `${cx - shapeSize / 2},${cy + shapeSize / 2}`;
        const p3 = `${cx + shapeSize / 2},${cy + shapeSize / 2}`;
        shapeContent = `<polygon points="${p1} ${p2} ${p3}" fill="none" stroke="${color}" stroke-width="2" />`;
        break;
      case "rectangle":
        shapeContent = `<rect x="${cx - shapeSize * 0.75 / 2}" y="${cy - shapeSize * 0.5 / 2}" width="${shapeSize * 0.75}" height="${shapeSize * 0.5}" fill="none" stroke="${color}" stroke-width="2" />`;
        break;
      default:
        warnings.push(`Unsupported shape: ${item.shape}`);
        shapeContent = `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="Arial" font-size="12">[?]</text>`;
    }

    const labelContent = `<text x="${cx}" y="${cy + shapeSize / 2 + 20}" text-anchor="middle" font-family="Arial" font-size="16" fill="#000000">${label}</text>`;

    return `<g>${shapeContent}${labelContent}</g>`;
  }
}
