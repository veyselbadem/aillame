export class SvgSafetyService {
  /**
   * Escapes a string for use in SVG text elements.
   */
  static escapeText(text: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Sanitizes a color string to prevent injection.
   */
  static sanitizeColor(color: string | undefined, fallback: string = "#000000"): string {
    if (!color) return fallback;
    // Allow standard hex or basic color names
    if (/^#[0-9A-Fa-f]{3,6}$/.test(color)) return color;
    const safeColors = ["red", "blue", "green", "black", "white", "yellow", "orange", "purple", "gray", "grey"];
    if (safeColors.includes(color.toLowerCase())) return color.toLowerCase();
    return fallback;
  }

  /**
   * Final check of the SVG string to ensure no prohibited tags or attributes.
   */
  static isSafe(svg: string): boolean {
    const prohibited = ["<script", "foreignObject", "onload", "onerror", "onclick", "javascript:"];
    return !prohibited.some(p => svg.includes(p));
  }
}
