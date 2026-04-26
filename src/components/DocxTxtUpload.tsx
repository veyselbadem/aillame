'use client';

import { useRef, useState } from 'react';
import { extractDocxText, extractTxtText } from '@core/documents/docx-parser';
import type { DocumentRecord } from '@apptypes/document';

interface DocxTxtUploadProps {
  onExtracted: (doc: DocumentRecord) => void;
}

export default function DocxTxtUpload({ onExtracted }: DocxTxtUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      let content = '';
      let type: 'docx' | 'txt' = 'txt';
      if (file.name.endsWith('.docx')) {
        content = await extractDocxText(file);
        type = 'docx';
      } else if (file.name.endsWith('.txt')) {
        content = await extractTxtText(file);
        type = 'txt';
      } else {
        throw new Error('Desteklenmeyen dosya türü');
      }
      const doc: DocumentRecord = {
        id: Date.now().toString(),
        name: file.name,
        type,
        content,
        createdAt: Date.now(),
      };
      onExtracted(doc);
    } catch (err) {
      setError('Dosya okunamadı.');
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
        accept=".docx,.txt"
        onChange={handleFile}
        className="file-input"
      />
      {loading && <span>Yükleniyor...</span>}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
