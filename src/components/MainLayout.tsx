'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          className={`relative z-10 flex-1 flex flex-col transition-all duration-500 min-w-0 ${sidebarOpen ? 'md:ml-[316px]' : 'ml-0'}`}
        >
          {children}
        </main>
      </div>
    </>
  );
}
