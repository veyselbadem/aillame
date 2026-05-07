'use client';

import Sidebar from '@/components/Sidebar';
import ModelLibraryPanel from '@/components/admin/ModelLibraryPanel';
import { useState, useEffect } from 'react';
import { FiPackage } from 'react-icons/fi';
import { ADMIN_TOKEN_KEY } from '@/lib/admin-fetch';

export default function ModelLibraryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    setAuthorized(!!token);
  }, []);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className={`flex-1 overflow-y-auto transition-all duration-200 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {authorized === null ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Kontrol ediliyor...</div>
        ) : !authorized ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
            <FiPackage size={32} className="text-zinc-600" />
            <p className="text-sm">Bu sayfaya erişmek için admin token gereklidir.</p>
            <a href="/admin/login" className="text-xs text-indigo-400 hover:underline">Admin girişine git</a>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <FiPackage className="text-indigo-400" size={20} />
                <h1 className="text-xl font-bold text-white">Runtime & Model Kütüphanesi</h1>
              </div>
              <p className="text-sm text-zinc-400">
                Yerel model keşfi, runtime readiness ve güvenli hazırlık işlemleri.
              </p>
            </div>

            <section className="mb-5 grid gap-3 md:grid-cols-4">
              {[
                ['Text Runtime', 'degraded preview'],
                ['GGUF Readiness', 'not configured'],
                ['Registry', 'model count visible'],
                ['Fallback', 'safe response enabled'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-zinc-700/40 bg-zinc-900/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-200">{value}</p>
                </div>
              ))}
            </section>

            <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/50 p-5">
              <ModelLibraryPanel />
            </div>

            <section className="mt-8 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FiPackage className="text-emerald-400" size={16} />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Discover & Watchlist (E2E Foundation)</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/50 p-5">
                    <h3 className="text-sm font-bold mb-3">Model Watchlist</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Gemma-2B-GGUF', status: 'up-to-date', fit: 'likely' },
                        { name: 'Qwen2-7B-GGUF', status: 'update-available', fit: 'warning' }
                      ].map(item => (
                        <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/50">
                          <div>
                            <p className="text-xs font-bold text-zinc-200">{item.name}</p>
                            <p className="text-[10px] text-zinc-500">Hardware Fit: {item.fit}</p>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.status === 'up-to-date' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/50 p-5">
                    <h3 className="text-sm font-bold mb-3">Compatibility Analysis</h3>
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                        <div className="flex justify-between mb-2">
                          <span className="text-xs text-indigo-300">Selected Model Compatibility</span>
                          <span className="text-xs font-bold text-indigo-200">85%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 w-[85%]"></div>
                        </div>
                        <p className="mt-2 text-[10px] text-zinc-400 leading-relaxed">
                          GGUF format detected. Quantization Q4_K_M is optimized for local RAM usage. Hardware fit: likely.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-700/20">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  <span className="font-bold text-zinc-400 uppercase tracking-tighter">Note:</span> Aillame local model discovery bu fazda offline-first ve plan-only seviyesindedir. 
                  Model indirme ve güncellemeler explicit kullanıcı onayı gerektirir.
                </p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
