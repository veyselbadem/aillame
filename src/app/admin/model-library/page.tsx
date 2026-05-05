'use client';

import Sidebar from '@/components/Sidebar';
import ModelLibraryPanel from '@/components/admin/ModelLibraryPanel';
import { useState } from 'react';
import { FiPackage } from 'react-icons/fi';

export default function ModelLibraryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className={`flex-1 overflow-y-auto transition-all duration-200 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
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
      </main>
    </div>
  );
}
