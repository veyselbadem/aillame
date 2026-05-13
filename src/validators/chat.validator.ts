import { Request, Response, NextFunction } from 'express';
import { ApiResponseHelper } from '../utils/api-response';

export const validateChatRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json(
      ApiResponseHelper.error('INVALID_REQUEST', 'Request body bir obje olmalıdır.')
    );
  }

  // message checks
  if (!body.message) {
    return res.status(400).json(
      ApiResponseHelper.error('MESSAGE_REQUIRED', 'message alanı zorunludur.')
    );
  }

  if (typeof body.message !== 'string') {
    return res.status(400).json(
      ApiResponseHelper.error('INVALID_MESSAGE', 'message alanı string olmalıdır.')
    );
  }

  if (body.message.length > 20000) {
    return res.status(400).json(
      ApiResponseHelper.error('MESSAGE_TOO_LONG', 'message alanı izin verilen maksimum uzunluğu aşıyor.')
    );
  }

  // context checks
  if (body.context) {
    if (typeof body.context !== 'object') {
      return res.status(400).json(
        ApiResponseHelper.error('INVALID_CONTEXT', 'context alanı geçerli bir obje olmalıdır.')
      );
    }

    if (body.context.files) {
      if (!Array.isArray(body.context.files)) {
        return res.status(400).json(
          ApiResponseHelper.error('INVALID_FILES', 'context.files bir array olmalıdır.')
        );
      }

      if (body.context.files.length > 10) {
        return res.status(400).json(
          ApiResponseHelper.error('TOO_MANY_CONTEXT_FILES', 'context.files en fazla 10 dosya içerebilir.')
        );
      }

      let totalContentSize = 0;
      for (const file of body.context.files) {
        if (typeof file.path !== 'string' || typeof file.content !== 'string') {
          return res.status(400).json(
            ApiResponseHelper.error('INVALID_FILE_STRUCTURE', 'Her dosya geçerli path ve content içermelidir.')
          );
        }

        if (file.content.length > 50000) {
          return res.status(400).json(
            ApiResponseHelper.error('CONTEXT_FILE_TOO_LARGE', 'Context içindeki dosyalardan biri izin verilen maksimum boyutu aşıyor.')
          );
        }

        totalContentSize += file.content.length;
      }

      if (totalContentSize > 200000) {
        return res.status(400).json(
          ApiResponseHelper.error('CONTEXT_TOO_LARGE', 'Toplam context boyutu izin verilen maksimum sınırı aşıyor.')
        );
      }
    }
  }

  next();
};
