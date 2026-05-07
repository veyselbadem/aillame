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
    <div className="flex h-screen theme-shell">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className={`flex-1 overflow-y-auto transition-all duration-200 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {authorized === null ? (
          <div className="flex h-full items-center justify-center text-sm theme-muted">Kontrol ediliyor...</div>
        ) : !authorized ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 theme-muted">
            <FiPackage size={32} className="text-indigo-500" />
            <p className="text-sm">Bu sayfaya erişmek için admin token gereklidir.</p>
            <a href="/admin/login" className="text-xs text-indigo-600 hover:underline dark:text-indigo-300">Admin girişine git</a>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl px-6 py-8">
            <div className="mb-6">
              <div className="mb-1 flex items-center gap-2">
                <FiPackage className="text-indigo-500 dark:text-indigo-300" size={20} />
                <h1 className="text-xl font-bold theme-title">Runtime & Model Kütüphanesi</h1>
              </div>
              <p className="text-sm theme-muted">
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
                <div key={label} className="theme-surface rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] theme-muted">{label}</p>
                  <p className="mt-2 text-sm font-semibold theme-secondary">{value}</p>
                </div>
              ))}
            </section>

            <div className="theme-surface rounded-xl p-5">
              <ModelLibraryPanel />
            </div>

            <section className="mt-8 space-y-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <FiPackage className="text-emerald-600 dark:text-emerald-300" size={16} />
                  <h2 className="text-sm font-bold uppercase tracking-widest theme-muted">Discover & Watchlist (E2E Foundation)</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="theme-surface rounded-xl p-5">
                    <h3 className="mb-3 text-sm font-bold theme-title">Model Watchlist</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Gemma-2B-GGUF', status: 'up-to-date', fit: 'likely' },
                        { name: 'Qwen2-7B-GGUF', status: 'update-available', fit: 'warning' },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-lg theme-elevated p-3">
                          <div>
                            <p className="text-xs font-bold theme-title">{item.name}</p>
                            <p className="text-[10px] theme-muted">Hardware Fit: {item.fit}</p>
                          </div>
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] ${
                            item.status === 'up-to-date'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="theme-surface rounded-xl p-5">
                    <h3 className="mb-3 text-sm font-bold theme-title">Compatibility Analysis</h3>
                    <div className="space-y-4">
                      <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                        <div className="mb-2 flex justify-between">
                          <span className="text-xs text-indigo-700 dark:text-indigo-300">Selected Model Compatibility</span>
                          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200">85%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-full w-[85%] bg-indigo-500" />
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed theme-muted">
                          GGUF format detected. Quantization Q4_K_M is optimized for local RAM usage. Hardware fit: likely.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="theme-soft-panel rounded-xl p-4">
                <p className="text-[11px] leading-relaxed theme-muted">
                  <span className="font-bold uppercase tracking-tighter theme-secondary">Not:</span> Aillame local model discovery bu fazda offline-first ve plan-only seviyesindedir.
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
