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
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Kontrol ediliyor…</div>
        ) : !authorized ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
            <FiPackage size={32} className="text-zinc-600" />
            <p className="text-sm">Bu sayfaya erişmek için admin token gereklidir.</p>
            <a href="/admin/login" className="text-xs text-indigo-400 hover:underline">Admin girişine git</a>
          </div>
        ) : (
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Page header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <FiPackage className="text-indigo-400" size={20} />
              <h1 className="text-xl font-bold text-white">Model Kütüphanesi</h1>
            </div>
            <p className="text-sm text-zinc-400">
              Yerel model keşfi, durum izleme ve güvenli hazırlık işlemleri
            </p>
          </div>

          {/* Panel */}
          <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/50 p-5">
            <ModelLibraryPanel />
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
