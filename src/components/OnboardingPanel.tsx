'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FiCheckCircle, FiShield, FiFolder, FiCpu, FiPlay, FiX } from 'react-icons/fi';

export default function OnboardingPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/') {
      setIsVisible(false);
      return;
    }

    const hasSeen = localStorage.getItem('aillame_onboarding_seen');
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, [pathname]);

  const dismiss = () => {
    localStorage.setItem('aillame_onboarding_seen', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface text-ink w-full max-w-2xl rounded-[32px] border border-white/10 shadow-2xl overflow-hidden relative animate-fade-in">
        <button 
          onClick={dismiss}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-muted transition-colors"
        >
          <FiX size={20} />
        </button>

        <div className="p-10">
          <h2 className="text-3xl font-black mb-2">Aillame'e Hoş Geldiniz!</h2>
          <p className="text-sm text-muted mb-8 font-medium">İlk 5 Dakika Deneyimi: Yerel AI Hub'ınızı kullanıma hazırlayalım.</p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <FiFolder size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">1. Model Path Check (Model Yolu)</h3>
                <p className="text-xs text-muted mt-1">Yerel LLM ve IGM modellerinizin (örn. GGUF, SDXL) doğru dizinlerde (AILLAME_MODEL_ROOT) yapılandırıldığından emin olun.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <FiCpu size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">2. Runtime Readiness (Çalışma Zamanı)</h3>
                <p className="text-xs text-muted mt-1">Llama-server ve IGM worker arka planda aktif mi? Sistem sağlığı monitöründen canlı durumlarını kontrol edebilirsiniz.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <FiShield size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">3. Workspace Selection (Çalışma Alanı)</h3>
                <p className="text-xs text-muted mt-1">Aillame'in erişebileceği güvenli yerel proje dizinini seçerek Agent'ın dosya okuma/yazma (Path Containment) sınırlarını belirleyin.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <FiPlay size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">4. Final Verification (Smoke Test)</h3>
                <p className="text-xs text-muted mt-1">Terminalden <code>npm run smoke:live-runtime-acceptance</code> komutunu çalıştırarak sistemin üretim ortamına hazır olduğunu onaylayın.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 flex justify-end">
            <button 
              onClick={dismiss}
              className="px-6 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              Kurulumu Tamamla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
