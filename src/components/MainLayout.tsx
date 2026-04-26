'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      {/* ThemeToggle must be OUTSIDE overflow-hidden container to stay fixed at top-right */}
      <ThemeToggle />

      <div className="flex min-h-screen bg-transparent transition-colors duration-500 overflow-hidden relative selection:bg-indigo-500/30">
      {/* Decorative Background Blobs */}
      <div className="bg-blob w-[600px] h-[600px] bg-indigo-600/10 -top-40 -left-40 pointer-events-none" aria-hidden="true" />
      <div className="bg-blob w-[500px] h-[500px] bg-purple-600/10 bottom-0 -right-20 pointer-events-none" style={{ animationDelay: '-5s' }} aria-hidden="true" />
      
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
