/**
 * Safe ESM Import Utility
 * Provides a way to dynamically import ESM modules in a CommonJS environment
 * without tsc converting the import() call to a require() call.
 */

/**
 * Dynamically imports an ESM module.
 * @param specifier The module identifier (e.g., 'node-llama-cpp')
 */
export async function safeImport<T = any>(specifier: string): Promise<T> {
  // Use (0, eval)('import') to get the true dynamic import function
  // that works across CJS/ESM boundaries in modern Node.js.
  const dynamicImport = (0, eval)('specifier => import(specifier)');
  return dynamicImport(specifier);
}
