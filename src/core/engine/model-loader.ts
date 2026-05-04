// [NANO-F5] Lazy model loader — 140MB V2 model uygulama başında değil,
// ilk V2 isteğinde yüklenir. V1 her zaman hazır bekler.

import { NANO_V1_CONFIG, NANO_V2_CONFIG } from './train-rust';

type ModelVersion = 'v1' | 'v2' | 'v3';

interface LoadedModel {
  version: ModelVersion;
  loadedAt: number;
  checkpointPath: string;
}

class NanoModelLoader {
  private loadedModels: Map<ModelVersion, LoadedModel> = new Map();
  private engines: Map<ModelVersion, any> = new Map();

  setEngine(engine: any, version: ModelVersion = 'v1') {
    this.engines.set(version, engine);
  }

  async ensureLoaded(version: ModelVersion): Promise<void> {
    if (this.loadedModels.has(version)) return;

    const engine = this.engines.get(version);
    if (!engine) {
      throw new Error(`[NANO-F5] Engine not set for version ${version}`);
    }

    const { NANO_V1_CONFIG, NANO_V2_CONFIG, NANO_V3_CONFIG } = await import('./train-rust');
    const config = version === 'v3' ? NANO_V3_CONFIG : (version === 'v2' ? NANO_V2_CONFIG : NANO_V1_CONFIG);

    console.log(`[NANO-F5] ${version.toUpperCase()} modeli yükleniyor...`);
    const start = Date.now();

    // V2/V3 ise motoru uygun modda başlat
    try {
      const { nativeModule } = await import('./rust-core');
      if (version === 'v2') {
        if (nativeModule && nativeModule.initNanoV2) {
          nativeModule.initNanoV2(engine);
        }
      } else if (version === 'v3') {
        if (nativeModule && nativeModule.initNanoV3) {
          nativeModule.initNanoV3(engine);
        }
      }
    } catch (err) {
      console.warn(`[NANO-F5] ${version} init hatası:`, err);
    }

    await engine.loadCheckpoint(config.checkpointPath);

    this.loadedModels.set(version, {
      version,
      loadedAt: Date.now(),
      checkpointPath: config.checkpointPath,
    });

    console.log(`[NANO-F5] ${version.toUpperCase()} yüklendi — ${Date.now() - start}ms`);
  }

  isLoaded(version: ModelVersion): boolean {
    return this.loadedModels.has(version);
  }

  getLoadedVersions(): ModelVersion[] {
    return Array.from(this.loadedModels.keys());
  }
}

export const modelLoader = new NanoModelLoader();
