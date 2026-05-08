import path from 'path';
import fs from 'fs';

let cachedRoot: string | undefined = undefined;

/**
 * Reliably finds the project root directory by searching for package.json
 * and validating it's not inside a build folder like .next or dist.
 */
export function getProjectRoot(): string {
  if (cachedRoot) return cachedRoot;

  // Search starting from __dirname
  let currentDir = __dirname;
  const rootDir = path.parse(currentDir).root;

  while (currentDir !== rootDir) {
    const pkgPath = path.join(currentDir, 'package.json');
    
    // Check if package.json exists here
    if (fs.existsSync(pkgPath)) {
      const dirName = path.basename(currentDir).toLowerCase();
      
      // Safety: Ensure we didn't stop in a build/runtime directory
      // that might contain a generated package.json
      const isBuildDir = ['.next', 'dist', 'build', 'node_modules'].includes(dirName);
      
      // Validation: Repo root should typically have a src directory or next.config.js
      const hasRootMarkers = fs.existsSync(path.join(currentDir, 'src')) || 
                             fs.existsSync(path.join(currentDir, 'next.config.js')) ||
                             fs.existsSync(path.join(currentDir, 'next.config.mjs'));

      if (!isBuildDir && hasRootMarkers) {
        cachedRoot = currentDir;
        return cachedRoot;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to process.cwd() but with same build dir safety
  let fallback = process.cwd();
  if (path.basename(fallback).toLowerCase() === '.next') {
    fallback = path.dirname(fallback);
  }
  
  cachedRoot = fallback;
  return cachedRoot;
}

/**
 * Resolves a path relative to the project root.
 * If the path is already absolute, it returns it as-is.
 */
export function resolveProjectRelative(relativePath: string): string {
  if (path.isAbsolute(relativePath)) return relativePath;
  return path.resolve(getProjectRoot(), relativePath);
}
