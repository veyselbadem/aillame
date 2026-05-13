import { Request, Response } from 'express';
import { ApiResponseHelper } from '../utils/api-response';

export const notFoundMiddleware = (req: Request, res: Response) => {
  res.status(404).json(
    ApiResponseHelper.error(
      'ROUTE_NOT_FOUND',
      'İstenen API endpointi bulunamadı.'
    )
  );
};
