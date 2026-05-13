export type AillameMode = "code" | "general" | "image_generation";

export interface AillameProjectConfig {
  id: string;
  name: string;
  description?: string;
  defaultMode: AillameMode;
  allowedModes: AillameMode[];
  memoryEnabled: boolean;
  autoApplyAllowed: boolean;
  allowedTools: string[];
  createdAt: string;
  isActive: boolean;
}

export interface AillameProjectContext {
  projectId: string;
  projectName: string;
  mode: AillameMode;
  memoryEnabled: boolean;
  autoApplyAllowed: boolean;
  allowedTools: string[];
}
