import React, { useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown, FiZap } from 'react-icons/fi';
import { useSettings } from '@hooks/useSettings';
import { NANO_PROFILES } from '@core/nano/nano-generation-config';

export const AillameModelSelector: React.FC = () => {
  const { nanoProfile, setNanoProfile } = useSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const profileData = NANO_PROFILES[nanoProfile] ?? NANO_PROFILES.balanced;
  const profileEntries = Object.entries(NANO_PROFILES);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-[120] min-w-0 flex-1 sm:flex-none">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="chat-composer-control group flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 text-left backdrop-blur-md transition sm:h-12 sm:min-w-[156px] sm:px-4"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Model seç"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FiZap size={14} className="flex-shrink-0 text-purple-500 dark:text-purple-300 transition-transform group-hover:scale-110" />
          <span className="truncate text-xs font-black uppercase tracking-widest">
            {profileData?.label ?? 'Model Seç'}
          </span>
        </span>
        <FiChevronDown
          size={14}
          className={`flex-shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="theme-surface pointer-events-auto absolute right-0 top-[calc(100%+10px)] z-[120] w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl"
          role="listbox"
        >
          {profileEntries.length === 0 ? (
            <div className="px-3 py-2.5 text-xs font-semibold text-slate-400">Model Seç</div>
          ) : (
            profileEntries.map(([profileKey, profile]) => {
              const selected = profileKey === nanoProfile;
              return (
                <button
                  key={profileKey}
                  type="button"
                  onClick={() => {
                    setNanoProfile(profileKey);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.07]"
                  role="option"
                  aria-selected={selected}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black uppercase tracking-widest text-[var(--text-main)]">
                      {profile.label}
                    </span>
                  </span>
                  {selected && <FiCheck size={14} className="flex-shrink-0 text-purple-300" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
