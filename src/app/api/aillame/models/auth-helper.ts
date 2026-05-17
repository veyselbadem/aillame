import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/services/api-key.service';
import { ApiResponseHelper } from '@/utils/api-response';

export async function validateRequest(req: NextRequest) {
  // Check both possible headers
  const apiKey = req.headers.get('x-api-key') || req.headers.get('x-aillame-api-key');

  const { valid, record, error } = ApiKeyService.validateApiKey(apiKey || '');

  if (!valid) {
    if (error === 'MISSING') {
      return { 
        isValid: false, 
        response: NextResponse.json(ApiResponseHelper.error('MISSING_API_KEY', 'Aillame API key eksik.'), { status: 401 }) 
      };
    }
    
    if (error === 'INACTIVE') {
      return { 
        isValid: false, 
        response: NextResponse.json(ApiResponseHelper.error('INACTIVE_API_KEY', 'Aillame API key pasif durumda.'), { status: 403 }) 
      };
    }

    return { 
      isValid: false, 
      response: NextResponse.json(ApiResponseHelper.error('INVALID_API_KEY', 'Aillame API key geçersiz.'), { status: 401 }) 
    };
  }

  return { isValid: true, record };
}
