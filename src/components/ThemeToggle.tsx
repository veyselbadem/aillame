'use client';

import { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const getInitialTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') return 'dark';
      if (savedTheme === 'light') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const initialTheme = getInitialTheme();
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      setIsDark(false);
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      setIsDark(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl glass-card text-indigo-400 hover:text-indigo-300 transition-all active:scale-90 shadow-xl flex items-center justify-center border-white/10 pointer-events-auto"
      style={{ position: 'fixed', top: '1rem', right: '1rem', left: 'auto', zIndex: 9999, cursor: 'pointer' }}
      title={isDark ? 'Aydınlık mod' : 'Karanlık mod'}
      aria-label={isDark ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
    >
      {isDark ? (
        <FiSun size={18} className="animate-fade-in" />
      ) : (
        <FiMoon size={18} className="animate-fade-in" />
      )}
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-indigo-500/5 rounded-xl blur-sm opacity-0 hover:opacity-100 pointer-events-none transition-opacity" />
    </button>
  );
}
