import fs from 'fs';
import {
  type LocalModelDiscoveryOptions,
  type LocalModelMetadata,
  type ModelInstallRequest,
  type ModelInstallResult,
  type ModelRemoveRequest,
  type ModelRemoveResult,
} from './types';
import { discoverLocalModels } from './discovery';
import { createModelRegistrySnapshot, findModelById } from './model-registry';
import { normalizeLocalModelPath, sanitizeModelId, isPathInsideAllowedRoots } from './paths';
import { activeGgufModelService } from '../models/download/active-gguf-model-service';

type InstallRecord = {
  installId: string;
  modelId: string;
  status: ModelInstallResult['status'];
  message: string;
  updatedAt: string;
  supported: boolean;
  reason?: string;
};

const installRecords = new Map<string, InstallRecord>();

export async function listLocalModels(options: LocalModelDiscoveryOptions = {}): Promise<LocalModelMetadata[]> {
  return await discoverLocalModels(options);
}

export async function refreshLocalModelLibrary(options: LocalModelDiscoveryOptions = {}) {
  const models = await discoverLocalModels(options);
  return createModelRegistrySnapshot(models);
}

export async function getLocalModelStatus(modelId: string, options: LocalModelDiscoveryOptions = {}) {
  const models = await listLocalModels(options);
  const model = findModelById(models, modelId);

  if (!model) {
    return {
      found: false,
      modelId: sanitizeModelId(modelId),
      status: 'missing' as const,
      message: 'Model local library içinde bulunamadı.',
    };
  }

  return {
    found: true,
    model,
    modelId: model.id,
    status: model.status,
    message: model.status === 'available'
      ? 'Model yerel kütüphanede kullanılabilir.'
      : 'Model bulundu ancak durumu available değil.',
  };
}

export function validateModelInstallRequest(request: ModelInstallRequest): { ok: boolean; message?: string } {
  if (!request || typeof request !== 'object') {
    return { ok: false, message: 'Geçersiz install isteği.' };
  }

  if (!request.modelId || typeof request.modelId !== 'string') {
    return { ok: false, message: 'modelId zorunludur.' };
  }

  if (request.sourceUrl && typeof request.sourceUrl !== 'string') {
    return { ok: false, message: 'sourceUrl metin olmalıdır.' };
  }

  if (request.targetDirectory && typeof request.targetDirectory !== 'string') {
    return { ok: false, message: 'targetDirectory metin olmalıdır.' };
  }

  return { ok: true };
}

export async function prepareModelInstall(request: ModelInstallRequest): Promise<ModelInstallResult> {
  const validation = validateModelInstallRequest(request);
  if (!validation.ok) {
    return {
      ok: false,
      status: 'failed',
      message: validation.message || 'Install isteği geçersiz.',
      supported: false,
      reason: 'invalid_request',
    };
  }

  if (request.sourceUrl) {
    return {
      ok: false,
      status: 'disabled',
      message: 'Bu fazda uzaktan model indirme devre dışıdır.',
      supported: false,
      reason: 'remote_download_not_supported',
    };
  }

  const modelId = sanitizeModelId(request.modelId);
  const localStatus = await getLocalModelStatus(modelId);

  if (localStatus.found && localStatus.model) {
    const installId = `install_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: InstallRecord = {
      installId,
      modelId,
      status: 'available',
      message: 'Model zaten yerel kütüphanede mevcut.',
      updatedAt: new Date().toISOString(),
      supported: true,
    };
    installRecords.set(installId, record);

    return {
      ok: true,
      installId,
      status: 'available',
      message: record.message,
      model: localStatus.model,
      supported: true,
    };
  }

  const normalizedTarget = request.targetDirectory
    ? normalizeLocalModelPath(request.targetDirectory)
    : '';

  return {
    ok: false,
    status: 'missing',
    message: normalizedTarget
      ? `Model şu an bulunamadı. Hedef klasör doğrulandı: ${normalizedTarget}.`
      : 'Model şu an yerel kütüphanede bulunamadı. Bu fazda otomatik indirme yoktur.',
    supported: false,
    reason: 'local_model_not_found',
  };
}

export function getModelInstallStatus(installId: string) {
  const item = installRecords.get((installId || '').trim());
  if (!item) {
    return {
      found: false,
      installId,
      status: 'failed' as const,
      message: 'Install kaydı bulunamadı.',
      supported: false,
      reason: 'install_not_found',
    };
  }

  return {
    found: true,
    ...item,
  };
}

// ── Helpers for Removal ──────────────────────────────────────────────────

async function deleteOllamaModel(ollamaName: string): Promise<{ ok: boolean; message: string }> {
  const baseUrl = (process.env.AILLAME_OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/api/delete`, {
      method: 'DELETE',
      body: JSON.stringify({ name: ollamaName }),
    });
    if (res.ok) {
      return { ok: true, message: `Ollama modeli başarıyla kaldırıldı: ${ollamaName}` };
    }
    const errData = await res.json().catch(() => ({}));
    return { ok: false, message: `Ollama hatası: ${errData.error || res.statusText}` };
  } catch (error) {
    return { ok: false, message: `Ollama sunucusuna bağlanılamadı: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ── Main Removal Service ─────────────────────────────────────────────────

export async function removeLocalModel(request: ModelRemoveRequest): Promise<ModelRemoveResult> {
  const modelId = sanitizeModelId(request?.modelId || '');
  const dryRun = request?.dryRun !== false;
  const confirmDelete = request?.confirmDelete === true;

  if (!modelId) {
    return {
      ok: false,
      dryRun,
      message: 'modelId zorunludur.',
      modelId: '',
    };
  }

  // 1. Find the model to determine its runtime/provider and path
  const models = await listLocalModels();
  const model = findModelById(models, modelId);

  if (!model) {
    return {
      ok: false,
      dryRun,
      message: 'Model kütüphanede bulunamadı. Zaten silinmiş veya farklı bir klasörde olabilir.',
      modelId,
    };
  }

  // Check if model is currently active
  try {
    const activeModel = activeGgufModelService.getActiveGgufModel();
    if (activeModel && (activeModel.modelId === model.id || (model.localPath && activeModel.filePath === model.localPath))) {
      return {
        ok: false,
        dryRun: false,
        message: `Bu model (${model.name}) şu anda sistemde AKTİF olarak seçili. Silmeden önce başka bir modele geçiş yapmalısınız.`,
        modelId,
      };
    }
  } catch {
    // Ignore error in active model check
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      message: `Kaldırma simülasyonu: ${model.name} (${model.provider}) kaldırılabilir.`,
      modelId,
    };
  }

  if (!confirmDelete) {
    return {
      ok: false,
      dryRun: false,
      message: 'Silme işlemi için confirmDelete onayı gereklidir.',
      modelId,
    };
  }

  // 2. Perform actual deletion based on provider
  
  // Ollama models
  if (model.provider === 'ollama' || model.runtime === 'ollama') {
    const ollamaName = model.id.startsWith('ollama-') ? model.id.slice(7) : model.name;
    const result = await deleteOllamaModel(ollamaName);
    return {
      ...result,
      dryRun: false,
      modelId,
    };
  }

  // Local file-based models (GGUF, Safetensors, etc.)
  if (model.localPath) {
    if (!isPathInsideAllowedRoots(model.localPath)) {
      return {
        ok: false,
        dryRun: false,
        message: 'Güvenlik ihlali: Model dosyası izin verilen kök dizinlerin dışında.',
        modelId,
      };
    }

    try {
      if (fs.existsSync(model.localPath)) {
        const stats = fs.statSync(model.localPath);
        if (stats.isDirectory()) {
          fs.rmSync(model.localPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(model.localPath);
        }
        return {
          ok: true,
          dryRun: false,
          message: `Model dosyası fiziksel olarak silindi: ${model.fileName || model.name}`,
          modelId,
        };
      } else {
        return {
          ok: false,
          dryRun: false,
          message: 'Model dosyası fiziksel olarak bulunamadı; muhtemelen manuel silinmiş.',
          modelId,
        };
      }
    } catch (err) {
      return {
        ok: false,
        dryRun: false,
        message: `Fiziksel silme hatası: ${err instanceof Error ? err.message : String(err)}`,
        modelId,
      };
    }
  }

  return {
    ok: false,
    dryRun: false,
    message: `Bu model türü (${model.provider}/${model.runtime}) için otomatik kaldırma henüz desteklenmiyor.`,
    modelId,
  };
}
