import { AillameRuntimeError } from '../types/runtime.types';

export const createRuntimeError = (
  code: string,
  message: string,
  details?: { modelId?: string; runtime?: string; [key: string]: any }
): AillameRuntimeError => {
  return {
    success: false,
    error: {
      code,
      message,
      details: details ? { ...details } : undefined
    },
    modelId: details?.modelId,
    runtime: details?.runtime
  };
};
