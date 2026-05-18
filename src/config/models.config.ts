import { AillameLocalModelConfig } from '../types/model.types';

export const LOCAL_MODEL_CONFIGS: AillameLocalModelConfig[] = [
  {
    id: "aillame-code-small",
    name: "Aillame Code Small",
    description: "Kod analizi ve kod üretimi için varsayılan küçük yerel model.",
    provider: "aillame-local",
    runtime: "aillame-gguf",
    type: "code-generation",
    path: "./models/aillame-code-small.gguf",
    defaultForModes: ["code"],
    supportedTaskTypes: [
      "code_review",
      "code_analysis",
      "code_generation",
      "code_assistant",
      "connection_test"
    ],
    contextWindow: 8192,
    maxOutputTokens: 2048,
    temperature: 0.2,
    isActive: true,
    createdAt: new Date("2026-05-10").toISOString()
  },
  {
    id: "aillame-chat-small",
    name: "Aillame Chat Small",
    description: "Genel sohbet ve açıklama görevleri için varsayılan küçük yerel model.",
    provider: "aillame-local",
    runtime: "aillame-gguf",
    type: "text-generation",
    path: "./models/aillame-chat-small.gguf",
    defaultForModes: ["general"],
    supportedTaskTypes: [
      "general_chat",
      "explanation",
      "connection_test"
    ],
    contextWindow: 8192,
    maxOutputTokens: 2048,
    temperature: 0.7,
    isActive: true,
    createdAt: new Date("2026-05-10").toISOString()
  },
  {
    id: "aillame-image-prompt-small",
    name: "Aillame Image Prompt Small",
    description: "Görsel üretim promptları hazırlamak için varsayılan yerel model.",
    provider: "aillame-local",
    runtime: "aillame-gguf",
    type: "image-prompt",
    path: "./models/aillame-image-prompt-small.gguf",
    defaultForModes: ["image_generation"],
    supportedTaskTypes: [
      "image_prompt",
      "image_generation_prompt"
    ],
    contextWindow: 4096,
    maxOutputTokens: 1024,
    temperature: 0.8,
    isActive: true,
    createdAt: new Date("2026-05-10").toISOString()
  }
];
