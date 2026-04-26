import type { ImageAttachment } from '@apptypes/attachments';
import { MAX_IMAGE_ATTACHMENT_BYTES, SUPPORTED_IMAGE_MIME_TYPES } from '@apptypes/attachments';

export function isSupportedImageType(type: string): type is ImageAttachment['mimeType'] {
  return SUPPORTED_IMAGE_MIME_TYPES.includes(type as ImageAttachment['mimeType']);
}

export function validateImageFile(file: File): string | null {
  if (!isSupportedImageType(file.type)) {
    return 'PNG, JPG, JPEG veya WEBP formatında bir görsel seçin.';
  }

  if (file.size > MAX_IMAGE_ATTACHMENT_BYTES) {
    return 'Görsel en fazla 10 MB olabilir.';
  }

  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export async function createImageAttachment(file: File): Promise<ImageAttachment> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  return {
    id: `${Date.now()}-${file.name}`,
    name: file.name,
    mimeType: file.type as ImageAttachment['mimeType'],
    size: file.size,
    dataUrl: await readFileAsDataUrl(file),
    uploadedAt: Date.now(),
  };
}
