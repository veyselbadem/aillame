'use client';

import { useRef, useEffect, useState } from 'react';
import { FiImage, FiSend, FiX, FiZap, FiMic, FiMicOff } from 'react-icons/fi';
import { useVoiceInput } from '@hooks/useVoiceInput';
import type { ImageAttachment } from '@apptypes/attachments';
import { createImageAttachment, validateImageFile } from '@/lib/image-attachments';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  visionEnabled?: boolean;
  attachments?: ImageAttachment[];
  onAttachmentsChange?: (attachments: ImageAttachment[]) => void;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  visionEnabled = false,
  attachments = [],
  onAttachmentsChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const { state: voiceState, toggle: toggleVoice, supported: voiceSupported } = useVoiceInput({
    onTranscript: (text) => {
      onChange(value + (value ? ' ' : '') + text);
    },
  });

  const justSubmittedRef = useRef(false);

  const focusTextarea = () => {
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    if (disabled || isEmpty || voiceState === 'listening') return;
    onSend();
    justSubmittedRef.current = true;
    setTimeout(focusTextarea, 0);
  };

  useEffect(() => {
    if (justSubmittedRef.current && !disabled) {
      focusTextarea();
      justSubmittedRef.current = false;
    }
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setImageError(null);

    try {
      const nextAttachments: ImageAttachment[] = [];
      for (const file of files.slice(0, 4)) {
        const validation = validateImageFile(file);
        if (validation) throw new Error(validation);
        nextAttachments.push(await createImageAttachment(file));
      }
      onAttachmentsChange?.([...attachments, ...nextAttachments].slice(0, 4));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Görsel eklenemedi.');
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange?.(attachments.filter((attachment) => attachment.id !== id));
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  const isEmpty = !value.trim() && attachments.length === 0;

  return (
    <div className="relative group input-glow rounded-[26px] transition-all duration-500">
      <div
        className="absolute -inset-0.5 rounded-[27px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent), var(--primary))',
          backgroundSize: '200% 200%',
          animation: 'gradientFlow 3s linear infinite',
          filter: 'blur(4px)',
        }}
      />

      <div className="relative glass-card rounded-[26px] overflow-hidden border-white/10 shadow-2xl">
        {attachments.length > 0 && (
          <div className="flex gap-3 px-5 pt-5 pb-2 overflow-x-auto custom-scrollbar bg-white/[0.02]">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-black/40 shadow-xl group/img">
                <img src={attachment.dataUrl} alt={attachment.name} className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-xl bg-black/80 text-white/80 hover:text-rose-400 backdrop-blur-md border border-white/5 transition-all"
                  title="Görseli kaldır"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {imageError && (
          <div className="px-6 pt-4 text-[11px] font-black uppercase tracking-widest text-rose-400/90 animate-fade-in">
            {imageError}
          </div>
        )}

        <div className="flex items-end px-2 pb-2 pt-1">
          <div className="flex items-center gap-1 px-2 pb-1.5">
            {visionEnabled && (
              <div className="flex-shrink-0">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl text-gray-500 hover:bg-white/5 hover:text-indigo-400 transition-all active:scale-90 group/btn"
                  title="Görsel ekle"
                  disabled={disabled}
                >
                  <FiImage size={20} className="group-hover/btn:rotate-6 transition-transform" />
                </button>
              </div>
            )}

            {voiceSupported && (
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                    voiceState === 'listening'
                      ? 'bg-rose-500/20 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                      : 'text-gray-500 hover:bg-white/5'
                  }`}
                  title="Sesli Komut"
                >
                  {voiceState === 'listening' ? <FiMicOff size={20} className="animate-pulse" /> : <FiMic size={20} />}
                </button>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voiceState === 'listening' ? 'Sizi dinliyorum...' : visionEnabled ? 'Bir görev verin veya görsel yükleyin...' : "Aillame'ye bir görev yazın..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] text-slate-900 dark:text-white/90 py-5 px-4 placeholder-slate-400 dark:placeholder-white/20 resize-none outline-none min-h-[60px] max-h-48 leading-relaxed font-medium"
            disabled={disabled || voiceState === 'listening'}
          />

          <div className="px-3 pb-2.5">
            <button
              id="send-message-btn"
              type="button"
              onClick={handleSend}
              disabled={disabled || isEmpty || voiceState === 'listening'}
              className="send-btn w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-600 text-white disabled:opacity-20 disabled:grayscale shadow-xl shadow-indigo-600/20 relative group/send overflow-hidden"
              title="Gönder (Enter)"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/send:opacity-100 transition-opacity" />
              {disabled
                ? <FiZap size={18} className="animate-pulse" />
                : <FiSend size={18} className="group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform" />
              }
            </button>
          </div>
        </div>
      </div>

      {value.length > 0 && (
        <div className="absolute -bottom-5 right-3 text-[9px] text-gray-600 font-mono animate-fade-in">
          {value.length} karakter
        </div>
      )}
    </div>
  );
}
