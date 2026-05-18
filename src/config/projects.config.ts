import { AillameProjectConfig } from '../types/project.types';

export const PROJECT_CONFIGS: AillameProjectConfig[] = [
  {
    id: "doomsgame-engine",
    name: "Doomsgame Engine",
    description: "Doomsgame Engine için Aillame entegrasyon projesi.",
    defaultMode: "code",
    allowedModes: ["code", "general", "image_generation"],
    memoryEnabled: true,
    autoApplyAllowed: false,
    allowedTools: [
      "code_analysis",
      "code_generation",
      "file_suggestion",
      "image_prompt"
    ],
    createdAt: new Date("2026-05-10").toISOString(),
    isActive: true
  },
  {
    id: "aillame-admin",
    name: "Aillame Admin",
    description: "Sistem yönetimi ve test projesi.",
    defaultMode: "general",
    allowedModes: ["general", "code", "image_generation"],
    memoryEnabled: true,
    autoApplyAllowed: true,
    allowedTools: ["all"],
    createdAt: new Date("2026-05-14").toISOString(),
    isActive: true
  }
];
