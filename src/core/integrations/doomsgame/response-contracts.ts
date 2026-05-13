export interface GamePlanResponse {
  type: "game_plan";
  title: string;
  genre: string;
  mechanics: string[];
  scenes: {
    name: string;
    description: string;
    importance: "primary" | "secondary" | "bonus";
  }[];
  characters: {
    name: string;
    role: string;
    traits: string[];
  }[];
  goals: string[];
  rules: string[];
  safety: {
    canAutoApply: boolean;
    reasoning: string;
  };
}

export interface ScenePlanResponse {
  type: "scene_plan";
  sceneName: string;
  environment: string;
  objects: {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }[];
  spawnPoints: {
    id: string;
    tag: string;
    position: { x: number; y: number; z: number };
  }[];
  camera: {
    type: string;
    fov: number;
    initialPosition: { x: number; y: number; z: number };
  };
  physics: {
    gravity: number;
    enabled: boolean;
  };
  safety: {
    canAutoApply: boolean;
    reasoning: string;
  };
}

export interface AssetPlanResponse {
  type: "asset_plan";
  assetType: "sprite" | "model" | "audio" | "texture";
  prompt: string;
  style: string;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  usage: string;
  alternatives: string[];
  safety: {
    canAutoApply: boolean;
    reasoning: string;
  };
}

export interface ScriptPlanResponse {
  type: "script_plan";
  filename: string;
  targetObject: string;
  behavior: string;
  codeSnippet: string;
  safetyNotes: string[];
  requiresApproval: boolean;
}

export interface ErrorFixResponse {
  type: "error_fix";
  errorSummary: string;
  probableCause: string;
  steps: string[];
  proposedPatch: {
    targetFiles: string[];
    description: string;
    diff?: string;
  };
  needsApproval: boolean;
}

export interface EngineQueryResponse {
  type: "engine_query";
  explanation: string;
  relatedModule: string;
  usageExample: string;
  precautions: string[];
}

export type DoomsgameResponse =
  | GamePlanResponse
  | ScenePlanResponse
  | AssetPlanResponse
  | ScriptPlanResponse
  | ErrorFixResponse
  | EngineQueryResponse;
