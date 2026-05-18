import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { ApiResponseHelper } from '../utils/api-response';

export const apiKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.header('x-aillame-api-key');

  const { valid, record, error } = ApiKeyService.validateApiKey(apiKey || '');

  if (!valid) {
    if (error === 'MISSING') {
      return res.status(401).json(
        ApiResponseHelper.error('MISSING_API_KEY', 'Aillame API key eksik.')
      );
    }
    
    if (error === 'INACTIVE') {
      return res.status(403).json(
        ApiResponseHelper.error('INACTIVE_API_KEY', 'Aillame API key pasif durumda.')
      );
    }

    return res.status(401).json(
      ApiResponseHelper.error('INVALID_API_KEY', 'Aillame API key geçersiz.')
    );
  }

  // Set auth context
  if (record) {
    req.aillameAuth = {
      keyId: record.id,
      name: record.name,
      projectId: record.projectId,
      allowedModes: record.allowedModes,
    };
  }

  next();
};
