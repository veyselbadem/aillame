'use client';

import { useRef, useState } from 'react';
import { extractPdfText } from '@core/documents/pdf-parser';
import type { DocumentRecord } from '@apptypes/document';

interface PdfUploadProps {
  onExtracted: (doc: DocumentRecord) => void;
}

export default function PdfUpload({ onExtracted }: PdfUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const content = await extractPdfText(file);
      const doc: DocumentRecord = {
        id: Date.now().toString(),
        name: file.name,
        type: 'pdf',
        content,
        createdAt: Date.now(),
      };
      onExtracted(doc);
    } catch (err) {
      setError('PDF okunamadı.');
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
        accept="application/pdf"
        onChange={handleFile}
        className="file:mr-2 file:py-2 file:px-4 file:rounded file:bg-blue-500 file:text-white"
        disabled={loading}
      />
      {loading && <span className="text-blue-600">Yükleniyor...</span>}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
