"use client";

import React from 'react';
import { WorkspaceAgentExecutionReadinessPreview } from '../../../components/agent/WorkspaceAgentExecutionReadinessPreview';

export default function WorkspaceAgentReadinessPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="p-8 border-b border-slate-900 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Execution Readiness Preview</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Boundary: Phase 57 - No Execution / No Persistence</p>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">MODE: READINESS_ONLY</span>
                <span className="text-[9px] text-slate-600 mt-1">ActionExecutor: DISCONNECTED</span>
             </div>
          </div>
        </div>
      </div>

      <main className="py-8">
        <WorkspaceAgentExecutionReadinessPreview />
      </main>

      <footer className="py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center opacity-50">
          <div className="text-[10px] text-slate-500 mb-4 md:mb-0">
            Aillame Workspace Agent Pipeline &copy; 2024
          </div>
          <div className="flex space-x-6 text-[10px] font-bold uppercase tracking-widest">
            <span className="text-red-500">No Execution</span>
            <span className="text-red-500">No Write</span>
            <span className="text-yellow-500">Preview Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
