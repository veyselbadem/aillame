import React from 'react';
import { useSettings } from '@hooks/useSettings';
import { NANO_PROFILES } from '@core/nano/nano-generation-config';
import { FiZap, FiActivity, FiStar, FiSettings } from 'react-icons/fi';

export const NanoProfileSelector: React.FC = () => {
  const { nanoProfile, setNanoProfile } = useSettings();

  const profiles = [
    { id: 'fast', icon: FiZap, color: 'text-amber-400' },
    { id: 'balanced', icon: FiActivity, color: 'text-indigo-400' },
    { id: 'quality', icon: FiStar, color: 'text-emerald-400' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
      {profiles.map((p) => {
        const isSelected = nanoProfile === p.id;
        const profileData = NANO_PROFILES[p.id];
        const Icon = p.icon;

        return (
          <button
            key={p.id}
            onClick={() => setNanoProfile(p.id)}
            title={`${profileData.label}: ${profileData.description}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
              isSelected 
                ? 'bg-white/10 shadow-lg shadow-black/20 text-white' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Icon size={12} className={isSelected ? p.color : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">{profileData.label}</span>
          </button>
        );
      })}
      
      <div className="w-px h-4 bg-white/10 mx-1" />
      
      <button className="p-1.5 text-white/30 hover:text-white/60 transition-colors">
        <FiSettings size={12} />
      </button>
    </div>
  );
};
