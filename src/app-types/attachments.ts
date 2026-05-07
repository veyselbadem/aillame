export type ImageAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  dataUrl?: string;
  data?: string; // Standardized for core logic
  width?: number;
  height?: number;
  uploadedAt?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const MAX_IMAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
