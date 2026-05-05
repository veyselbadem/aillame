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
import { normalizeLocalModelPath, sanitizeModelId } from './paths';

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

export function listLocalModels(options: LocalModelDiscoveryOptions = {}): LocalModelMetadata[] {
  return discoverLocalModels(options);
}

export function refreshLocalModelLibrary(options: LocalModelDiscoveryOptions = {}) {
  const models = discoverLocalModels(options);
  return createModelRegistrySnapshot(models);
}

export function getLocalModelStatus(modelId: string, options: LocalModelDiscoveryOptions = {}) {
  const models = listLocalModels(options);
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

export function prepareModelInstall(request: ModelInstallRequest): ModelInstallResult {
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
  const localStatus = getLocalModelStatus(modelId);

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

export function removeLocalModel(request: ModelRemoveRequest): ModelRemoveResult {
  const modelId = sanitizeModelId(request?.modelId || '');
  const dryRun = request?.dryRun !== false;

  if (!modelId) {
    return {
      ok: false,
      dryRun,
      message: 'modelId zorunludur.',
      modelId: '',
    };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      message: 'Dry-run remove: model silinmedi, sadece doğrulama yapıldı.',
      modelId,
    };
  }

  return {
    ok: false,
    dryRun: false,
    message: 'Gerçek model silme bu fazda devre dışıdır.',
    modelId,
  };
}
