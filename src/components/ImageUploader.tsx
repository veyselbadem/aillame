'use client';

import { useRef, useState } from 'react';
import type { VisionInput } from '@apptypes/vision';

interface ImageUploaderProps {
  onUpload: (input: VisionInput) => void;
}

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const url = URL.createObjectURL(file);
      const input: VisionInput = {
        id: Date.now().toString(),
        file,
        url,
        uploadedAt: Date.now(),
      };
      onUpload(input);
    } catch (err) {
      setError('Görsel yüklenemedi.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="file:mr-2 file:py-2 file:px-4 file:rounded file:bg-purple-500 file:text-white"
        disabled={loading}
      />
      {loading && <span className="text-purple-600">Yükleniyor...</span>}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
