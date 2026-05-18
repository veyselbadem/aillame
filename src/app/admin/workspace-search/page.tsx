import React from 'react';
import { WorkspaceSearchPanel } from '../../../components/workspace/WorkspaceSearchPanel';

export const metadata = {
  title: 'Workspace Search Preview | Admin',
};

export default function WorkspaceSearchPreviewPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-1/3 min-w-[320px] max-w-md h-full border-r border-gray-200 dark:border-gray-800">
        <WorkspaceSearchPanel />
      </div>
      
      <div className="flex-1 h-full p-8 bg-white dark:bg-gray-950 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Workspace Search & Retrieval Preview
          </h1>
          
          <div className="prose dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-400">
            <p>
              This is a safe preview environment for the Phase 23 Workspace Search functionality.
              It allows you to test queries against a mock/in-memory index without exposing
              real file paths or secret contents.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2 text-gray-800 dark:text-gray-200">
              Security Boundaries Maintained (Phase 24):
            </h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>No RAG Injection:</strong> Results shown here are not passed to Nano, Chat, or any RAG pipeline.</li>
              <li><strong>No Path Leaks:</strong> Absolute, canonical, and physical paths are completely masked or excluded.</li>
              <li><strong>No Secrets:</strong> Potential API keys, tokens, or passwords are redacted.</li>
              <li><strong>No Action Execution:</strong> This panel is read-only. It cannot trigger file writes or AI agent actions.</li>
              <li><strong>No Real Network/Disk I/O:</strong> This preview uses in-memory mock data (or safe dry-run endpoints) avoiding actual workspace scan execution.</li>
            </ul>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800/30">
              <p className="text-blue-800 dark:text-blue-300 font-medium">
                Try searching for:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-blue-700 dark:text-blue-400">
                <li><code>bootstrap</code> (Content match)</li>
                <li><code>app.ts</code> (Filename match)</li>
                <li><code>preview snippet</code> (Content match)</li>
                <li><code>password</code> (Will trigger sensitive content redaction behavior if matched)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
