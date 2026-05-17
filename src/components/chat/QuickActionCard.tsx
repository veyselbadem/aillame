import React from 'react';
import { IconType } from 'react-icons';

interface QuickActionCardProps {
  icon: IconType;
  title: string;
  description: string;
  onClick: () => void;
  iconBg: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon: Icon, title, onClick, iconBg }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="theme-surface group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[20px] text-left shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-300/40 hover:shadow-purple-500/10"
      aria-label={title}
      title={title}
    >
      <div className="relative z-10">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3 ${iconBg}`}>
          <Icon size={28} aria-hidden="true" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
};
