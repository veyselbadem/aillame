import path from 'path';
import Module from 'module';

/**
 * Aillame Alias Resolver
 * This script resolves path aliases (@/, @core/, etc.) at runtime for the compiled Express API.
 * It is necessary because tsc does not resolve these aliases during compilation.
 */

// @ts-ignore
const originalResolveFilename = (Module as any)._resolveFilename || Module.prototype._resolveFilename;

// @ts-ignore
(Module as any)._resolveFilename = function(request: string, parent: any, isMain: boolean) {
  const aliasMap: Record<string, string> = {
    '@': path.join(__dirname, '..'),
    '@core': path.join(__dirname, '..', 'core'),
    '@components': path.join(__dirname, '..', 'components'),
    '@hooks': path.join(__dirname, '..', 'hooks'),
    '@providers': path.join(__dirname, '..', 'providers'),
    '@apptypes': path.join(__dirname, '..', 'app-types'),
    '@lib': path.join(__dirname, '..', 'lib'),
  };

  for (const [alias, aliasPath] of Object.entries(aliasMap)) {
    if (request === alias || request.startsWith(alias + '/')) {
      const relativePath = request.slice(alias.length);
      // Ensure we don't have double slashes and handle the root alias correctly
      const normalizedRelativePath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
      const newPath = path.resolve(aliasPath, normalizedRelativePath);
      
      return originalResolveFilename.call(this, newPath, parent, isMain);
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain);
};
