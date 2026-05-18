'use client';

import Link from 'next/link';
import { FiHome, FiAlertCircle } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen theme-shell flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 neural-grid opacity-20" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-md flex flex-col items-center">
        <div className="inline-flex p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6 animate-pulse">
          <FiAlertCircle size={48} />
        </div>
        
        <h1 className="text-8xl font-black tracking-tighter text-gradient leading-none mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
          Sayfa Bulunamadı
        </h2>
        
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-8">
          Ulaşmaya çalıştığınız sayfa mevcut değil veya başka bir adrese taşınmış olabilir. Lütfen adresi kontrol edin veya ana sayfaya dönün.
        </p>
        
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 font-black uppercase tracking-[0.2em] text-xs text-white transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
        >
          <FiHome size={16} />
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
