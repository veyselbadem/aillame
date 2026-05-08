export function normalizeProjectId(input: string | undefined): string {
  if (!input || typeof input !== 'string') return 'default';
  
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Only allow a-z, 0-9, and dashes
    .replace(/-+/g, '-')       // Remove multiple dashes
    .replace(/^-+|-+$/g, '');  // Trim dashes from start/end
    
  return normalized.slice(0, 32) || 'default';
}
