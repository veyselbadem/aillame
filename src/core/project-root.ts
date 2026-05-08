import path from 'path';
import fs from 'fs';

let cachedRoot: string | undefined = undefined;

/**
 * Reliably finds the project root directory by searching for package.json
 * starting from the current directory and climbing up.
 * Falls back to process.cwd() if not found.
 */
export function getProjectRoot(): string {
  if (cachedRoot) return cachedRoot;

  // In Next.js/Webpack, __dirname might be mangled or point to a build folder.
  // We try to find package.json starting from the current module's location.
  let currentDir = __dirname;
  
  // Basic climb-up search for package.json
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      cachedRoot = currentDir;
      return cachedRoot;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback if we can't find package.json (unlikely in this setup)
  cachedRoot = process.cwd();
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
