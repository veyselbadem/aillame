'use client';

import { useState, useCallback, useRef } from 'react';
import { liveLearning } from '@core/orchestrator/live-learning';
import type { ImageAttachment } from '@apptypes/attachments';
import { createImageAttachment, validateImageFile } from '@/lib/image-attachments';

export type DroppedFileType = 'txt' | 'docx' | 'pdf' | 'epub' | 'image' | 'unknown';

export interface DroppedFile {
  name: string;
  type: DroppedFileType;
  content: string;
  size: number;
  attachment?: ImageAttachment;
}

interface UseDragDropOptions {
  onFileProcessed?: (file: DroppedFile) => void;
  onMessage?: (text: string) => void;
}

function detectType(file: File): DroppedFileType {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.txt')) return 'txt';
  if (lowerName.endsWith('.docx')) return 'docx';
  if (lowerName.endsWith('.pdf')) return 'pdf';
  if (lowerName.endsWith('.epub')) return 'epub';
  if (file.type.startsWith('image/')) return 'image';
  return 'unknown';
}

export function useDragDrop({ onFileProcessed, onMessage }: UseDragDropOptions = {}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastFile, setLastFile] = useState<DroppedFile | null>(null);
  const dragCountRef = useRef(0);

  const processFile = useCallback(async (file: File): Promise<DroppedFile | null> => {
    const type = detectType(file);
    setIsProcessing(true);

    try {
      let content = '';
      let attachment: ImageAttachment | undefined;

      if (type === 'txt') {
        content = await file.text();
      } else if (type === 'docx') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value;
        } catch {
          content = `[DOCX dosyası: ${file.name} - içerik çıkarılamadı]`;
        }
      } else if (type === 'pdf') {
        content = `[PDF: ${file.name} - /library sayfasından yükleyin]`;
      } else if (type === 'epub') {
        content = `[EPUB: ${file.name} - /library sayfasından yükleyin]`;
      } else if (type === 'image') {
        // Validate against shared rules (same as ChatInput)
        const validationError = validateImageFile(file);
        if (validationError) {
          onMessage?.(validationError);
          return null;
        }
        attachment = await createImageAttachment(file);
        content = `[Görsel dosya: ${file.name}]`;
      } else {
        content = `[Desteklenmeyen dosya: ${file.name}]`;
      }

      const dropped: DroppedFile = {
        name: file.name,
        type,
        content,
        size: file.size,
        attachment,
      };

      if (content.length > 20 && type !== 'unknown' && type !== 'image') {
        liveLearning.learnFromContent(content.substring(0, 4000), 'document').catch(() => {});
      }

      setLastFile(dropped);
      onFileProcessed?.(dropped);

      const msg = type === 'txt' || type === 'docx'
        ? `"${file.name}" dosyasını okudum ve hafızama aldım. ${content.length} karakter öğrendim. Bu dosya hakkında ne sormak istersin?`
        : type === 'image'
        ? `"${file.name}" görselini sohbete ekledim. Pro modda Qwen3-VL ile analiz edebilirsin.`
        : `"${file.name}" dosyasını aldım (${type.toUpperCase()}). Devam etmek için uygun sayfayı kullan.`;
      onMessage?.(msg);

      return dropped;
    } catch (err) {
      console.error('[DragDrop] File processing error:', err);
      onMessage?.(err instanceof Error ? err.message : 'Dosya işlenemedi.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [onFileProcessed, onMessage]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current === 0) setIsDragOver(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Single-file rule: mirror ChatInput behaviour
    if (files.length > 1) {
      onMessage?.('Aynı anda yalnızca bir görsel ekleyebilirsiniz.');
      return;
    }

    // Unsupported non-image file type shortcut message
    const file = files[0];
    if (!file.type.startsWith('image/') && detectType(file) === 'unknown') {
      onMessage?.('Sadece PNG, JPEG veya WebP görseller desteklenir.');
      return;
    }

    await processFile(file);
  }, [processFile, onMessage]);

  return {
    isDragOver,
    isProcessing,
    lastFile,
    processFile,
    dragHandlers: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
