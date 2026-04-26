'use client';

import { useState } from 'react';
import DocxTxtUpload from '@components/DocxTxtUpload';
import type { DocumentRecord } from '@apptypes/document';
import { analyzeDocument } from '@core/documents/analyze';
import { LocalBrowserLLMProvider } from '@providers/llm/local-browser';
import { FiBookOpen, FiFileText, FiCpu, FiCheckCircle } from 'react-icons/fi';

export default function LibraryPage() {
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [analysis, setAnalysis] = useState<{ summary: string; keywords: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExtracted(document: DocumentRecord) {
    setDoc(document);
    setAnalysis(null);
    setLoading(true);
    const provider = new LocalBrowserLLMProvider();
    await provider.loadModel();
    const result = await analyzeDocument(provider, document.content.slice(0, 4000));
    setAnalysis(result);
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">
        
        {/* Header Section */}
        <header className="space-y-4">
          <div className="flex items-center space-x-3 text-indigo-400">
            <FiBookOpen size={24} />
            <h1 className="text-4xl font-black tracking-tight text-white">Kütüphane</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            Belgelerini buraya yükleyerek Aillame'in bu bilgileri kalıcı hafızasına işlemesini sağlayabilirsin. 
            <span className="text-indigo-400/60 ml-2">Desteklenen: PDF, EPUB, DOCX, TXT</span>
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Upload Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-card p-8 rounded-[32px] border-white/5 space-y-6">
              <h3 className="text-white font-bold text-lg flex items-center space-x-2">
                <FiFileText className="text-indigo-500" />
                <span>Doküman Yükle</span>
              </h3>
              <DocxTxtUpload onExtracted={handleExtracted} />
              <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                  Yüklenen dokümanlar yerel olarak işlenir ve gizliliğiniz korunur.
                </p>
              </div>
            </div>
          </div>

          {/* Analysis Section */}
          <div className="lg:col-span-8">
            {!doc && !loading && (
              <div className="glass-card h-[400px] rounded-[32px] border-white/5 border-dashed flex flex-col items-center justify-center text-center p-8 opacity-40">
                <FiFileText size={48} className="mb-4 text-gray-600" />
                <p className="text-gray-400 font-medium">Henüz bir doküman seçilmedi.</p>
                <p className="text-xs text-gray-500 mt-2">Analiz sonuçları burada görünecek.</p>
              </div>
            )}

            {loading && (
              <div className="glass-card h-[400px] rounded-[32px] border-white/5 flex flex-col items-center justify-center space-y-6">
                <div className="w-12 h-12 border-[4px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-indigo-300/40 text-[10px] font-black uppercase tracking-[0.4em]">Neural Extraction...</p>
              </div>
            )}

            {doc && !loading && (
              <div className="space-y-6 animate-slide-up">
                {/* Content Preview */}
                <div className="glass-card p-8 rounded-[32px] border-white/5">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3 text-indigo-400">
                        <FiCheckCircle />
                        <span className="font-bold text-sm">Doküman Hazır</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{doc.type} • {Math.round(doc.content.length / 1024)} KB</span>
                   </div>
                   <h2 className="text-xl font-black text-white mb-4">{doc.name}</h2>
                   <div className="bg-black/20 rounded-2xl p-6 border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
                     <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{doc.content.slice(0, 1500)}...</p>
                   </div>
                </div>

                {/* AI Summary */}
                {analysis && (
                  <div className="glass-card p-8 rounded-[32px] border-indigo-500/20 bg-indigo-500/[0.02] space-y-6">
                    <div className="flex items-center space-x-3 text-emerald-400">
                      <FiCpu />
                      <h3 className="font-bold">AI Analiz Özeti</h3>
                    </div>
                    <p className="text-indigo-100/80 leading-relaxed">{analysis.summary}</p>
                    <div className="flex flex-wrap gap-2">
                       {analysis.keywords.map(kw => (
                         <span key={kw} className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                           {kw}
                         </span>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
