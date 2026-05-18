import { Router } from 'express';
import { ApiResponseHelper } from '../../utils/api-response';
import { APP_CONFIG } from '../../config/app.config';
import { RUNTIME_CONFIG } from '../../config/runtime.config';
import { DistillationStoreService } from '../../services/distillation/distillation-store.service';
import { IGMRuntimeReadiness } from '../../core/runtime/image/igm-runtime-readiness';
import { getHardwareInfo } from '../../services/runtime/llama-instance';

const router = Router();

router.get('/health', async (req, res) => {
  const distillation = DistillationStoreService.getHealthStatus();
  const hardware = await getHardwareInfo();
  const { CapabilityRegistry } = await import('../../core/models/capability-registry');
  const capabilities = CapabilityRegistry.getRegistrySummary();
  
  res.json({
    ...ApiResponseHelper.health(
      APP_CONFIG.SERVICE_NAME,
      'ok',
      APP_CONFIG.VERSION
    ),
    runtime: {
      gpu: RUNTIME_CONFIG.useGpu ? 'enabled' : 'disabled',
      hardwareGpu: hardware.gpu,
      canAccelerate: hardware.canUseGpu,
      inference: RUNTIME_CONFIG.enableRealInference ? 'real' : 'mock',
      devGate: RUNTIME_CONFIG.disableNativeInferenceInDev ? 'active' : 'inactive'
    },
    distillation: {
      active: distillation.active,
      unsafe: distillation.unsafe,
      quarantine: distillation.hasQuarantine
    },
    image: IGMRuntimeReadiness.getDiagnostics(),
    capabilities
  });
});

export default router;
