export interface VisualSpecItem {
  label: string;
  shape: "square" | "circle" | "triangle" | "rectangle";
  color?: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface VisualSpec {
  kind: string;
  items?: VisualSpecItem[];
  width?: number;
  height?: number;
  title?: string;
}

export interface SvgGenerationOptions {
  width?: number;
  height?: number;
  theme?: "light" | "print";
  showLabels?: boolean;
}

export interface SvgGenerationResult {
  ok: boolean;
  svg?: string;
  width: number;
  height: number;
  warnings: string[];
  error?: {
    code: string;
    message: string;
  };
}
