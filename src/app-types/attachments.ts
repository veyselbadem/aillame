export type ImageAttachment = {
  id: string;
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  size: number;
  dataUrl: string;
  uploadedAt: number;
};

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const MAX_IMAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
