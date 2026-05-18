import { NativeDiffusionAdapter } from './services/vision/native-diffusion-adapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// @ts-ignore
import sd from 'stable-diffusion-cpp-node-api';

sd.setLogCallback(({ level, text }: any) => {
    process.stderr.write(`[SD-CPP] ${text}`);
});

async function test() {
  console.log("--- Native Vision Standalone Test ---");
  
  const prompt = "a cute little apple tree, illustration for kids";
  console.log(`Prompt: ${prompt}`);

  // Test sequence of potential model paths
  const models = [
    process.env.AILLAME_VISION_MODEL_PATH,
    'C:\\aillame-models\\diffusion\\sdxl-turbo-1.0\\sd_xl_turbo_1.0.safetensors',
    'C:\\aillame-models\\diffusion\\sd_xl_turbo_1.0_fp16.safetensors'
  ].filter(Boolean) as string[];

  let result: any = { success: false, error: 'No models found' };

  for (const model of models) {
    console.log(`\n--- Attempting with model: ${model} ---`);
    process.env.AILLAME_VISION_MODEL_PATH = model;
    
    result = await NativeDiffusionAdapter.generateImage({
      prompt: prompt,
      width: 512,
      height: 512,
      steps: 4
    });

    if (result.success) break;
    console.log(`❌ Model failed: ${result.error}`);
    await NativeDiffusionAdapter.unload();
  }
  
  if (result.success) {
    console.log("✅ Success!");
    console.log(`File Path: ${result.filePath}`);
    console.log(`Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
  } else {
    console.error("❌ Failed!");
    console.error(`Error: ${result.error}`);
  }
  
  await NativeDiffusionAdapter.unload();
  process.exit(result.success ? 0 : 1);
}

test().catch(err => {
  console.error("Fatal error during test:", err);
  process.exit(1);
});
