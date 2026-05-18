import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { ApiResponseHelper } from '../utils/api-response';
import { AillameMode } from '../types/project.types';

export const projectModeMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Ensure auth context exists (from apiKeyMiddleware)
  if (!req.aillameAuth) {
    return res.status(401).json(
      ApiResponseHelper.error('MISSING_API_KEY', 'Aillame API key eksik.')
    );
  }

  // Extract projectId and mode from body, query, or params
  const projectId = req.body.projectId || req.query.projectId || req.params.projectId;
  const mode = req.body.mode || req.query.mode;

  if (!projectId) {
    return res.status(400).json(
      ApiResponseHelper.error('PROJECT_ID_REQUIRED', 'projectId alanı zorunludur.')
    );
  }

  const project = ProjectService.getProjectById(projectId);

  if (!project) {
    return res.status(404).json(
      ApiResponseHelper.error('PROJECT_NOT_FOUND', 'Belirtilen Aillame projesi bulunamadı.')
    );
  }

  if (!project.isActive) {
    return res.status(403).json(
      ApiResponseHelper.error('PROJECT_INACTIVE', 'Belirtilen Aillame projesi pasif durumda.')
    );
  }

  // Check if API key is authorized for this project
  if (req.aillameAuth.projectId !== projectId) {
    return res.status(403).json(
      ApiResponseHelper.error('PROJECT_KEY_MISMATCH', 'Bu API key belirtilen proje için yetkili değil.')
    );
  }

  // Resolve and validate mode
  const resolvedMode = (mode as AillameMode) || project.defaultMode;

  // Basic validation of mode enum
  const validModes: AillameMode[] = ["code", "general", "image_generation"];
  if (mode && !validModes.includes(mode as AillameMode)) {
    return res.status(400).json(
      ApiResponseHelper.error('INVALID_MODE', 'Geçersiz mode değeri.')
    );
  }

  // Check if mode is allowed by project
  if (!project.allowedModes.includes(resolvedMode)) {
    return res.status(403).json(
      ApiResponseHelper.error('MODE_NOT_ALLOWED', 'Bu mode belirtilen proje için izinli değil.')
    );
  }

  // Check if mode is allowed by API key
  const isKeyAllowed = req.aillameAuth.allowedModes.includes('all') || 
                       req.aillameAuth.allowedModes.includes(resolvedMode);

  if (!isKeyAllowed) {
    return res.status(403).json(
      ApiResponseHelper.error('MODE_NOT_ALLOWED', 'Bu mode bu API key için izinli değil.')
    );
  }

  // Set project context
  req.aillameProject = {
    projectId: project.id,
    projectName: project.name,
    mode: resolvedMode,
    memoryEnabled: project.memoryEnabled,
    autoApplyAllowed: project.autoApplyAllowed,
    allowedTools: project.allowedTools,
  };

  next();
};
