import './utils/alias-resolver';
import app from './app';
import { APP_CONFIG } from './config/app.config';
import { initializeAillame } from './core/init';
import { ActiveModelStateService } from './services/model/active-model-state.service';

const startServer = async () => {
  const port = APP_CONFIG.PORT;
  
  // Initialize Aillame State
  await initializeAillame().catch(console.error);
  
  // Warm up Hardware Info Cache
  const { getHardwareInfo } = await import('./services/runtime/llama-instance');
  getHardwareInfo().then(info => {
    console.log(`[Hardware] Detection complete: ${info.gpu} (Accelerate: ${info.canUseGpu})`);
  }).catch(err => {
    console.warn(`[Hardware] Detection failed:`, err);
  });
  
  // Validate Active Model
  const validation = await ActiveModelStateService.validateActiveModel().catch(console.error);
  if (validation && !validation.valid) {
    console.warn(`[Aillame State] Active model validation failed: ${validation.reason}`);
  }

  app.listen(port, () => {
    console.log(`[Aillame API] Server is running at http://127.0.0.1:${port}`);
    console.log(`[Aillame API] Health check: http://127.0.0.1:${port}/api/aillame/health`);
  });
};

startServer();
