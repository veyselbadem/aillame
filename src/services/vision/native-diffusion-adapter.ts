import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
// @ts-ignore
import sd from 'stable-diffusion-cpp-node-api';

export interface VisionGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  batchCount?: number;
}

export interface VisionGenerationResult {
  success: boolean;
  filePath: string;
  width: number;
  height: number;
  durationMs: number;
  error?: string;
}

const OUTPUT_DIR = path.join(process.cwd(), '.aillame-data', 'outputs');

export class NativeDiffusionAdapter {
  private static context: any = null;
  private static currentModelPath: string | null = null;

  /**
   * Initializes the Stable Diffusion context if not already loaded.
   */
  private static async ensureContext(modelPath: string): Promise<any> {
    if (this.context && this.currentModelPath === modelPath) {
      return this.context;
    }

    if (this.context) {
      console.log(`[NativeVision] Unloading previous model: ${this.currentModelPath}`);
      await this.context.close();
      this.context = null;
    }

    console.log(`[NativeVision] Loading model: ${modelPath}`);
    const useGpu = process.env.AILLAME_USE_GPU === 'true';
    
    // stable-diffusion-cpp-node-api uses sd.StableDiffusionContext.create
    // It automatically detects CUDA if built with it.
    this.context = await sd.StableDiffusionContext.create({
      modelPath,
      // Some models might need vaePath or clipLPath but we try single file first
    });

    this.currentModelPath = modelPath;
    console.log(`[NativeVision] Model loaded successfully.`);
    return this.context;
  }

  /**
   * Generates an image and saves it to the output directory.
   */
  static async generateImage(options: VisionGenerationOptions): Promise<VisionGenerationResult> {
    const startTime = Date.now();
    const modelPath = process.env.AILLAME_VISION_MODEL_PATH || 'C:\\aillame-models\\diffusion\\sd_xl_turbo_1.0_fp16.safetensors';

    try {
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      const ctx = await this.ensureContext(modelPath);

      console.log(`[NativeVision] Generating image with prompt: "${options.prompt}"`);
      
      const images = await ctx.generateImage({
        prompt: options.prompt,
        negativePrompt: options.negativePrompt || "",
        width: options.width || 512,
        height: options.height || 512,
        sampleParams: {
          sampleSteps: options.steps || 20,
          seed: options.seed ?? -1,
        }
      });

      if (!images || images.length === 0) {
        throw new Error("Görsel üretimi boş döndü.");
      }

      const img = images[0];
      const fileName = `vision_${Date.now()}.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      // Convert raw RGB to PNG using sharp
      await sharp(img.data, {
        raw: {
          width: img.width,
          height: img.height,
          channels: img.channel
        }
      })
      .png()
      .toFile(filePath);

      const durationMs = Date.now() - startTime;
      console.log(`[NativeVision] Image generated and saved to: ${filePath} (${durationMs}ms)`);

      return {
        success: true,
        filePath,
        width: img.width,
        height: img.height,
        durationMs
      };

    } catch (error: any) {
      console.error(`[NativeVision] Generation failed:`, error);
      return {
        success: false,
        filePath: "",
        width: 0,
        height: 0,
        durationMs: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Unloads the current model to free VRAM.
   */
  static async unload() {
    if (this.context) {
      console.log(`[NativeVision] Unloading model.`);
      await this.context.close();
      this.context = null;
      this.currentModelPath = null;
    }
  }
}
