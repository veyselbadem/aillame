import { Request, Response, NextFunction } from 'express';
import { ApiResponseHelper } from '../utils/api-response';

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[Global Error Handler]:', err);

  const statusCode = err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Aillame sunucusunda beklenmeyen bir hata oluştu.';

  res.status(statusCode).json(ApiResponseHelper.error(errorCode, message));
};
