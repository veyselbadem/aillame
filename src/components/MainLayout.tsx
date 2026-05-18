'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncMobileSidebar = () => {
      if (mediaQuery.matches) {
        setSidebarOpen(false);
      }
    };

    syncMobileSidebar();
    mediaQuery.addEventListener('change', syncMobileSidebar);
    return () => mediaQuery.removeEventListener('change', syncMobileSidebar);
  }, []);

  return (
    <>
      <ThemeToggle />

      <div className="theme-shell app-main-shell flex min-h-screen transition-colors duration-500 overflow-hidden relative selection:bg-indigo-500/30 neural-grid home-gradient-bg">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        <main
          id="main-content"
          className={`relative z-10 flex min-w-0 flex-1 flex-col transition-all duration-500 ${sidebarOpen ? 'md:ml-[316px]' : 'ml-0'} w-full`}
        >
          {children}
        </main>
      </div>
    </>
  );
}
