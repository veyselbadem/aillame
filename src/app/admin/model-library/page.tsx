'use client';

import Sidebar from '@/components/Sidebar';
import GgufModelSelector from '@/components/admin/GgufModelSelector';
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
          <div className="flex h-full items-center justify-center text-sm theme-muted">Yetkilendirme kontrol ediliyor...</div>
        ) : !authorized ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 theme-muted">
            <FiPackage size={32} className="text-indigo-500" />
            <p className="text-sm">Model yönetimi için yönetici erişimi gereklidir.</p>
            <a href="/admin/login" className="text-xs text-indigo-500 hover:underline">Giriş sayfasına git</a>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl px-6 py-10 animate-fade-in">
            <header className="mb-10">
              <div className="mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <FiPackage size={22} />
                </div>
                <h1 className="text-3xl font-black theme-title tracking-tight">Model Kütüphanesi</h1>
              </div>
              <p className="text-sm theme-muted max-w-2xl">
                Yerel yapay zeka varlıklarınızı yönetin, GGUF modellerini aktif çalışma zamanına bağlayın ve çıkarım durumunu izleyin.
              </p>
            </header>

            <div className="grid gap-8">
              <GgufModelSelector />
              
              {/* Discovery / Help Section */}
              <section className="theme-soft-panel rounded-[32px] p-8 flex items-start gap-6 border border-white/5 bg-indigo-500/[0.02]">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
                  <FiCpu size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black theme-title mb-2">Yerel Kaynak Optimizasyonu</h3>
                  <p className="text-sm theme-muted leading-relaxed">
                    Aillame, CPU/GPU bellek paylaşımını optimize etmek için metin üretimi tarafında GGUF formatını kullanır. 
                    Tüketici sınıfı donanımlar için Quantization (Q4_K_M gibi) şiddetle önerilir. 
                    Model yükleme sırasında sistem kaynaklarınızın yeterli olduğundan emin olun.
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
