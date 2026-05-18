'use client';

import { useRef, useState } from 'react';
import { extractDocxText, extractTxtText } from '@core/documents/docx-parser';
import type { DocumentRecord } from '@apptypes/document';
import { FiUpload, FiLoader } from 'react-icons/fi';

interface DocxTxtUploadProps {
  onExtracted: (doc: DocumentRecord) => void;
}

export default function DocxTxtUpload({ onExtracted }: DocxTxtUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <input
          id="docx-txt-upload"
          ref={inputRef}
          type="file"
          accept=".docx,.txt"
          onChange={handleFile}
          className="hidden"
          disabled={loading}
        />
        
        <div className="flex items-center gap-3">
          <label
            htmlFor="docx-txt-upload"
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-100 transition-all hover:border-indigo-400/60 hover:bg-indigo-500/20 active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiUpload />}
            <span>Dosya Seç</span>
          </label>
          
          <span className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
            {fileName || "Henüz dosya seçilmedi"}
          </span>
        </div>
      </div>
      
      {error && <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/5 px-3 py-1 rounded-lg border border-rose-500/10">{error}</span>}
    </div>
  );
}
