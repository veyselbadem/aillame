import { AillameProjectConfig, AillameMode } from '../types/project.types';
import { PROJECT_CONFIGS } from '../config/projects.config';

export class ProjectService {
  /**
   * Finds a project by ID.
   */
  static getProjectById(projectId: string): AillameProjectConfig | null {
    return PROJECT_CONFIGS.find(p => p.id === projectId) || null;
  }

  /**
   * Checks if a project is active.
   */
  static isProjectActive(projectId: string): boolean {
    const project = this.getProjectById(projectId);
    return project ? project.isActive : false;
  }

  /**
   * Checks if a mode is allowed for a project.
   */
  static isModeAllowedForProject(projectId: string, mode: string): boolean {
    const project = this.getProjectById(projectId);
    if (!project) return false;
    return project.allowedModes.includes(mode as AillameMode);
  }

  /**
   * Gets the default mode for a project.
   */
  static getDefaultModeForProject(projectId: string): AillameMode | null {
    const project = this.getProjectById(projectId);
    return project ? project.defaultMode : null;
  }

  /**
   * Validates project and mode.
   */
  static validateProjectMode(projectId: string, mode?: string): { 
    project: AillameProjectConfig; 
    mode: AillameMode 
  } | null {
    if (!projectId) return null;

    const project = this.getProjectById(projectId);
    if (!project || !project.isActive) return null;

    const resolvedMode = (mode as AillameMode) || project.defaultMode;

    if (!project.allowedModes.includes(resolvedMode)) return null;

    return { project, mode: resolvedMode };
  }
}
