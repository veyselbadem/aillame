'use client';

import Sidebar from '@/components/Sidebar';
import ModelLibraryPanel from '@/components/admin/ModelLibraryPanel';
import GgufModelManager from '@/components/admin/GgufModelManager';
import { useState, useEffect } from 'react';
import { FiPackage, FiCpu } from 'react-icons/fi';
import { ADMIN_TOKEN_KEY } from '@/lib/admin-fetch';

export default function ModelLibraryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    setAuthorized(!!token);
  }, []);

  return (
    <div className="flex h-screen theme-shell">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className={`flex-1 overflow-y-auto transition-all duration-200 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {authorized === null ? (
          <div className="flex h-full items-center justify-center text-sm theme-muted">Checking authorization...</div>
        ) : !authorized ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 theme-muted">
            <FiPackage size={32} className="text-indigo-500" />
            <p className="text-sm">Admin access required for model management.</p>
            <a href="/admin/login" className="text-xs text-indigo-500 hover:underline">Go to login</a>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-6 py-10 animate-fade-in">
            <header className="mb-10">
              <div className="mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <FiPackage size={22} />
                </div>
                <h1 className="text-3xl font-black theme-title tracking-tight">Model Kütüphanesi</h1>
              </div>
              <p className="text-sm theme-muted max-w-2xl">
                Yerel yapay zeka varlıklarınızı yönetin, çalışma zamanı (runtime) hazır olma durumunu doğrulayın ve yeni modeller keşfedin.
              </p>
            </header>

            <div className="grid gap-8">
              {/* GGUF Management Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] theme-muted">Yerel GGUF Runtime</h2>
                </div>
                <div className="theme-surface rounded-[24px] p-6">
                  <GgufModelManager />
                </div>
              </section>

              {/* Global Registry Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] theme-muted">Merkezi Model Kaydı (Registry)</h2>
                </div>
                <div className="theme-surface rounded-[24px] p-8">
                  <ModelLibraryPanel />
                </div>
              </section>

              {/* Discovery / Help Section */}
              <section className="theme-soft-panel rounded-2xl p-6 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                  <FiCpu size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold theme-title mb-1">Yerel Kaynak Optimizasyonu</h3>
                  <p className="text-xs theme-muted leading-relaxed max-w-3xl">
                    Aillame, CPU/GPU bellek paylaşımını optimize etmek için metin üretimi tarafında GGUF formatını kullanır. 
                    Tüketici sınıfı donanımlar için Quantization (Q4_K_M gibi) şiddetle önerilir. 
                    Görsel üretimi, tek adımlı çıkarım performansı için SDXL Turbo diffusers kullanır.
                  </p>
                </div>
              </section>
            </div>
          </div>

        )}
      </main>
    </div>

  );
}
