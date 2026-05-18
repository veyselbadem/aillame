export type AillameStepType = "explanation" | "action" | "warning" | "code" | "file_suggestion";

export interface AillameFormattedStep {
  type: AillameStepType;
  title: string;
  description: string;
}

export interface AillameSuggestedFile {
  path: string;
  action: "create" | "modify" | "delete";
  reason: string;
  content?: string;
  language?: string;
}

export interface AillameFormattedWarning {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export interface AillameFormattedResponse {
  answer: string;
  summary?: string;
  steps: AillameFormattedStep[];
  suggestedFiles: AillameSuggestedFile[];
  warnings: AillameFormattedWarning[];
  rawTextPreview: string;
  meta: {
    formatted: true;
    parser: "aillame-basic-v1";
    detectedStructuredJson: boolean;
    createdAt: string;
  };
}
