// ============================================================
// Aillame Model Manager — Type Definitions (FAZ 2)
// Pure type/interface file — no runtime imports, no side effects.
// ============================================================

/** Aillame operational tier: nano (local/fast) vs pro (heavy/capable) */
export type AillameTier = 'nano' | 'pro';

/** High-level model modality */
export type ModelType = 'text' | 'image' | 'multimodal';

/**
 * Runtime environment that executes the model.
 * - 'rust-candle'        : Aillame Nano engine (built-in Rust/Candle)
 * - 'internal-text'      : Unified Internal Text Runtime (FAZ 1 — lock-managed)
 * - 'llama-server-gguf'  : GGUF model via llama-server subprocess (sub-path of internal-text)
 * - 'ollama'             : Ollama API server
 * - 'python-transformers': Qwen/HuggingFace Python Transformers
 * - 'python-diffusers'   : SDXL / Flux via Python Diffusers
 * - 'external-api'       : Remote API (Gemini, OpenAI, etc.)
 * - 'browser-indexeddb'  : Client-side browser inference
 * - 'future-comfyui'     : Reserved — ComfyUI image worker (not implemented)
 */
export type ModelRuntime =
  | 'rust-candle'
  | 'internal-text'
  | 'llama-server-gguf'
  | 'ollama'
  | 'python-transformers'
  | 'python-diffusers'
  | 'external-api'
  | 'browser-indexeddb'
  | 'future-comfyui';

/**
 * What the model can do.
 * Fine-grained capability tags used by model-manager and AI Lab.
 */
export type ModelCapability =
  | 'text-generation'     // base text generation (legacy, keep for backward compat)
  | 'chat'                // multi-turn conversation
  | 'code'                // code generation / completion
  | 'instruct'            // instruction following
  | 'vision'              // image understanding / OCR
  | 'image-generation'    // text-to-image
  | 'multimodal'          // mixed modality input
  | 'embedding'           // vector embedding (future)
  | 'vision-image-understanding'  // legacy alias
  | 'multimodal-input'           // legacy alias
  | 'agent-task'
  | 'analysis';

/**
 * Central model descriptor.
 * Backward-compatible with FAZ 1 registry: legacy fields (label, shortLabel,
 * purpose, builtIn, repoId, etc.) are preserved alongside new FAZ 2 fields.
 */
export interface ManagedModel {
  // ---- Identity -------------------------------------------------------
  id: string;

  /** Human-readable display name. New field (FAZ 2). */
  displayName?: string;
  /** Legacy short label — kept for backward compat with existing consumers. */
  label: string;
  /** Optional compact label (sidebar, chips). */
  shortLabel?: string;

  // ---- Classification -------------------------------------------------
  tier: AillameTier;
  /** High-level purpose — legacy field, kept for backward compat. */
  purpose: 'chat' | 'image-generation';
  /** Model modality (FAZ 2). */
  type?: ModelType;
  /** Model family: 'qwen' | 'gemma' | 'sdxl' | 'nano' | 'flux' | ... */
  family?: string;

  // ---- Runtime --------------------------------------------------------
  runtime: ModelRuntime;
  capabilities: ModelCapability[];
  /** FAZ 1 compat: which internal-text sub-provider backs this model. */
  internalTextProvider?: 'gguf' | 'gemma' | 'ollama';

  // ---- Source / Path --------------------------------------------------
  /** HuggingFace repo ID (for download detection). */
  repoId?: string;
  /** GGUF filename within the repo. */
  filename?: string;
  /** Env variable name whose value is the local model file path. */
  localPathEnv?: string;
  /** FAZ 1 compat alias for localPathEnv. */
  modelPathEnv?: string;
  /** Env variable name whose value is the model root directory. */
  modelRootEnv?: string;
  /** External service model ID (e.g. Ollama tag, Gemini model name). */
  externalModelId?: string;

  // ---- Resource Profile -----------------------------------------------
  quantization?: string;        // e.g. 'Q4_K_M', 'Q8_0', 'f16'
  parameterSize?: string;       // e.g. '3B', '8B', '70B'
  contextSize?: number;         // max context window tokens
  recommendedRamGb?: number;    // minimum system RAM
  recommendedVramGb?: number;   // minimum GPU VRAM (0 = CPU-only)

  // ---- Policy ---------------------------------------------------------
  /** Modes this model is default for: 'code' | 'general' | 'fast' | ... */
  defaultForModes?: string[];
  /** Whether this model is active and eligible for routing. */
  enabled?: boolean;
  /** Marks unstable/preview models — shown with warning in AI Lab. */
  experimental?: boolean;

  // ---- Display / Meta (legacy, kept for backward compat) --------------
  sizeLabel?: string;
  licenseLabel?: string;
  description?: string;
  installHint?: string;
  /** Whether the model is built-in (no download needed). */
  builtIn?: boolean;

  // ---- Extra ----------------------------------------------------------
  notes?: string;
  tags?: string[];
}

/**
 * Runtime status value for a model as seen by Model Manager.
 * - 'available'      : Path resolved, runtime healthy
 * - 'configured'     : Metadata defined, runtime status unknown
 * - 'missing-config' : Required env var missing
 * - 'disabled'       : enabled: false
 * - 'experimental'   : experimental: true, use with caution
 * - 'unknown'        : Status could not be determined
 */
export type ModelStatusValue =
  | 'available'
  | 'configured'
  | 'missing-config'
  | 'disabled'
  | 'experimental'
  | 'unknown';

/** Model descriptor enriched with live status info. */
export interface ModelWithStatus {
  model: ManagedModel;
  status: ModelStatusValue;
  resolvedPath?: string;
  warnings?: string[];
}
