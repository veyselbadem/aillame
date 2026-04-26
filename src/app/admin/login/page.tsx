'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// UI şifresi env'den okunur. Tanımlı değilse MVP modunda
// yalnızca admin token varlığı yeterli kabul edilir.
const UI_USERNAME = process.env.NEXT_PUBLIC_AILLAME_ADMIN_USERNAME ?? '';
const UI_PASSWORD = process.env.NEXT_PUBLIC_AILLAME_ADMIN_PASSWORD ?? '';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Asıl API güvenliği için token zorunludur.
    if (!adminToken.trim()) {
      setError('Sistem erişimi için Admin Token gereklidir.');
      return;
    }

    // UI-level Username/Password pre-check (MVP)
    const usernameOk = UI_USERNAME ? username === UI_USERNAME : true;
    const passwordOk = UI_PASSWORD ? password === UI_PASSWORD : true;

    if (!usernameOk || !passwordOk) {
      setError('Geçersiz kullanıcı adı veya şifre!');
      return;
    }

    try {
      // Server-side Token Verification
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('admin_auth', 'true');
        localStorage.setItem('aillame_admin_token', adminToken.trim());
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Geçersiz admin token!');
      }
    } catch (err) {
      setError('Bağlantı hatası: Doğrulama yapılamadı.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-blob-container relative overflow-hidden">
      {/* Decorative blobs for admin page */}
      <div className="bg-blob w-[500px] h-[500px] bg-indigo-600/20 -top-20 -left-20" />
      <div className="bg-blob w-[400px] h-[400px] bg-purple-600/10 bottom-0 -right-10" />

      <div className="z-10 w-full max-w-md animate-fade-in">
        <div className="glass-card p-10 rounded-[40px] space-y-10 relative overflow-hidden border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
          {/* Top shimmer gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-[22px] bg-indigo-600 mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-6 group transition-transform hover:scale-110 duration-500">
              <span className="text-white font-black text-2xl">A</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Erişim Paneli</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.25em]">Aillame Control Center</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2">Kullanıcı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:border-indigo-500/50 focus:bg-white/[0.06] outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-medium"
                placeholder="Yönetici adı"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:border-indigo-500/50 focus:bg-white/[0.06] outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-medium"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 flex justify-between">
                <span>Sistem Tokenı</span>
                <span className="text-[8px] text-emerald-500/70">Server-Side Active</span>
              </label>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:border-indigo-500/50 focus:bg-white/[0.06] outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-medium"
                placeholder="AILLAME_ADMIN_TOKEN"
              />
            </div>

            {error && (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-xs text-center font-bold tracking-wide animate-slide-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 group relative overflow-hidden"
            >
              <span className="relative z-10">Sistem Girişi</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em]">Secure Verification Mode</p>
            </div>
            <p className="text-[8px] text-slate-700 font-mono">v1.2.4-stable</p>
          </div>
        </div>
      </div>
    </div>
  );
}
