'use client';

import { useRef, useState } from 'react';
import { extractEpubText } from '@core/documents/epub-parser';
import type { EpubRecord } from '@apptypes/epub';

interface EpubUploadProps {
  onExtracted: (doc: EpubRecord) => void;
}

export default function EpubUpload({ onExtracted }: EpubUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const content = await extractEpubText(file);
      const doc: EpubRecord = {
        id: Date.now().toString(),
        name: file.name,
        type: 'epub',
        content,
        createdAt: Date.now(),
      };
      onExtracted(doc);
    } catch (err) {
      setError('EPUB okunamadı.');
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
        accept="application/epub+zip,.epub"
        onChange={handleFile}
        className="file:mr-2 file:py-2 file:px-4 file:rounded file:bg-green-500 file:text-white"
        disabled={loading}
      />
      {loading && <span className="text-green-600">Yükleniyor...</span>}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
