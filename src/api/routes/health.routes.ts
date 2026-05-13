import { Router } from 'express';
import { ApiResponseHelper } from '../../utils/api-response';
import { APP_CONFIG } from '../../config/app.config';

const router = Router();

router.get('/health', (req, res) => {
  res.json(
    ApiResponseHelper.health(
      APP_CONFIG.SERVICE_NAME,
      'ok',
      APP_CONFIG.VERSION
    )
  );
});

export default router;
