'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <ThemeToggle />

      <div className="flex min-h-screen bg-transparent transition-colors duration-500 overflow-hidden relative selection:bg-indigo-500/30">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.08),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.04),transparent)]" aria-hidden="true" />

        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        <main
          id="main-content"
          className={`relative z-10 flex-1 flex flex-col transition-all duration-500 min-w-0 ${sidebarOpen ? 'md:ml-64' : 'ml-0'}`}
        >
          {children}
        </main>
      </div>
    </>
  );
}
