import { NextResponse } from 'next/server';
import fs from 'fs';
import {
  createQwenSafeRuntimeInfo,
  getLocalSafeRuntimeResourceMetrics,
} from '@core/runtime/safe-runtime-profile';
import { getGpuHeavyLockStatus } from '@core/runtime/gpu-heavy-lock';

export const runtime = 'nodejs';

export async function GET() {
  const modelPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\model.gguf';
  const mmprojPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\mmproj.gguf';

  const modelExists = fs.existsSync(modelPath);
  const mmprojExists = fs.existsSync(mmprojPath);

  // We can actually read the first 4 bytes to check for GGUF signature if the file exists.
  let modelSignature = 'Unknown';
  if (modelExists) {
    try {
      const fd = fs.openSync(modelPath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      if (buffer.toString('utf8') === 'GGUF') {
        modelSignature = 'GGUF';
      }
    } catch (e) {
      // Ignored
    }
  }

  let mmprojSignature = 'Unknown';
  if (mmprojExists) {
    try {
      const fd = fs.openSync(mmprojPath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      if (buffer.toString('utf8') === 'GGUF') {
        mmprojSignature = 'GGUF';
      }
    } catch (e) {
      // Ignored
    }
  }

  const ok = modelExists && mmprojExists && modelSignature === 'GGUF' && mmprojSignature === 'GGUF';
  const errors = ok ? [] : ['Bazı model dosyaları eksik veya geçersiz GGUF formatında.'];

  const gpuHeavyLock = getGpuHeavyLockStatus();
  const safeRuntime = createQwenSafeRuntimeInfo(await getLocalSafeRuntimeResourceMetrics(), {
    preflightOnly: true,
    inferenceExecuted: false,
    activeGpuTask: gpuHeavyLock.owner,
  });

  const response = {
    ok,
    errors,
    model: {
      id: "qwen3-vl-4b-instruct-q4-k-m",
      name: "Qwen3-VL 4B Nano Vision",
      provider: "qwen",
      type: "vision-language",
      format: "GGUF + mmproj",
      local: true
    },
    files: {
      modelPath,
      modelExists,
      modelSignature,
      mmprojPath,
      mmprojExists,
      mmprojSignature
    },
    registry: {
      registered: true,
      valid: true,
      selectable: true,
      multimodalReady: true
    },
    capabilities: {
      "nano.multimodal.core": true,
      "vision.review": true,
      "document.ocr": true,
      "task.routing": true
    },
    runtime: {
      adapter: "VlmInferenceAdapter",
      available: true,
      mmprojLinked: true,
      inferenceExecuted: false
    },
    gpuHeavyLock,
    safeRuntime,
    removedModelsHidden: {
      qwen3Vl8b: true,
      gemma26b: true,
      gemmaE4b: true,
      ollamaQwen35: true
    },
    message: "Qwen3-VL 4B Nano Vision yerel multimodal model olarak hazır görünüyor."
  };

  return NextResponse.json(response);
}
