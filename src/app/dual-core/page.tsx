'use client';

import DualCorePanel from '@components/DualCorePanel';

export default function DualCorePage() {
  return (
    <div className="flex-1 flex flex-col items-center w-full h-[100vh] pt-16 pb-4 px-4 md:px-8">
      <div className="w-full max-w-6xl h-full animate-fade-in pb-12">
        <DualCorePanel />
      </div>
    </div>
  );
}
