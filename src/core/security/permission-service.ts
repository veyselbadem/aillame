import { 
  AillameApiKey, 
  ApiKeyPermission, 
  PermissionCheckRequest, 
  PermissionCheckResult 
} from './models';

export class PermissionService {
  /**
   * Checks if an API key has the required permission for a specific project.
   */
  checkPermission(request: PermissionCheckRequest): PermissionCheckResult {
    const { apiKey, projectId, requiredScope } = request;

    if (!apiKey) {
      return { allowed: false, reason: "No API key provided." };
    }

    if (apiKey.status !== 'active') {
      return { allowed: false, reason: `API key is ${apiKey.status}.` };
    }

    // 1. Check scope permission
    const hasScope = apiKey.permissions.includes(requiredScope);
    
    // Admin scopes require global access and explicit admin permission
    if (requiredScope.startsWith('admin:')) {
      if (!hasScope) {
        return { allowed: false, reason: `Missing required administrative scope: ${requiredScope}` };
      }
      return { allowed: true };
    }

    if (!hasScope) {
      return { allowed: false, reason: `Missing required scope: ${requiredScope}` };
    }

    // 2. Check project isolation
    if (projectId) {
      // If the key is project-scoped, check if the requested project is in the allowed list
      if (apiKey.scope === 'project-scoped') {
        const isAllowedProject = apiKey.projectIds.includes(projectId);
        if (!isAllowedProject) {
          return { 
            allowed: false, 
            reason: `API key is not authorized for project: ${projectId}` 
          };
        }
      }
    } else if (apiKey.scope === 'project-scoped') {
      // If no projectId provided but key is project-scoped, we only allow if the operation is global-compatible
      // usually we'd reject if they try to access general data with a project-only key
      return { allowed: false, reason: "Project ID required for project-scoped API key." };
    }

    return { allowed: true };
  }

  /**
   * Helper to determine if we should enforce auth in the current environment.
   */
  shouldEnforceAuth(): boolean {
    const isProd = process.env.NODE_ENV === 'production';
    const forceAuth = process.env.AILLAME_EXTERNAL_API_AUTH_REQUIRED === 'true';
    
    if (isProd) return true;
    return forceAuth;
  }
}
