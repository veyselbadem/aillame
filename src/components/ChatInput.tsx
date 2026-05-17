'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { FiImage, FiSend, FiX, FiZap, FiMic, FiMicOff, FiAlertCircle, FiInfo, FiTrash2, FiPlus, FiArrowUp } from 'react-icons/fi';
import { AillameModelSelector } from './chat/AillameModelSelector';
import { useVoiceInput } from '@hooks/useVoiceInput';
import type { ImageAttachment } from '@apptypes/attachments';
import { createImageAttachment, validateImageFile } from '@/lib/image-attachments';
import { detectManualContextBoundary } from '@/core/indexing/manual-context-boundary';
import { auditChatMessage, checkInjectionPatterns } from '@/core/chat/message-audit';
import { removeManualContextFromDraft } from '@/core/chat/manual-context-cleanup';
import { getSafeWarningCopy } from '@/core/chat/manual-context-warning-copy';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  visionEnabled?: boolean;
  attachments?: ImageAttachment[];
  onAttachmentsChange?: (attachments: ImageAttachment[]) => void;
  variant?: 'bottom' | 'landing';
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  visionEnabled = false,
  attachments = [],
  onAttachmentsChange,
  variant = 'bottom',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const contextBoundary = useMemo(() => {
    return detectManualContextBoundary(value);
  }, [value]);

  const messageAudit = useMemo(() => {
    return auditChatMessage({ userVisibleMessage: value });
  }, [value]);

  const injectionWarnings = useMemo(() => {
    return checkInjectionPatterns(value);
  }, [value]);

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

    if (files.length > 1 || attachments.length > 0) {
      setImageError('Aynı anda yalnızca bir görsel ekleyebilirsiniz.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    setImageError(null);

    try {
      const file = files[0];
      const validation = validateImageFile(file);
      if (validation) throw new Error(validation);
      const newAttachment = await createImageAttachment(file);
      onAttachmentsChange?.([newAttachment]);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Görsel işlenirken bir hata oluştu.');
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange?.(attachments.filter((attachment) => attachment.id !== id));
  };

  const handleRemoveContext = () => {
    const result = removeManualContextFromDraft(value);
    if (result.status === "removed") {
      onChange(result.cleanedDraft);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  const isEmpty = !value.trim() && attachments.length === 0;

  if (variant === 'landing') {
    return (
      <div className="w-full max-w-[1100px] relative group">
        <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />
        
        <div className="chat-composer relative rounded-[28px] overflow-visible p-6 shadow-2xl">
          {attachments.length > 0 && (
            <div className="flex gap-3 pb-4 overflow-x-auto custom-scrollbar">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="relative flex items-center gap-3 p-2 pr-10 rounded-xl overflow-hidden border border-white/10 group/img bg-black/20 backdrop-blur-md">
                  <div className="h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden border border-white/10">
                    <img src={attachment.dataUrl} className="h-full w-full object-cover" alt="" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 max-w-[150px]">
                    <span className="text-xs font-semibold text-white/90 truncate">{attachment.name}</span>
                    <span className="text-[10px] text-white/50 mt-0.5">{attachment.size ? (attachment.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</span>
                  </div>
                  <button onClick={() => removeAttachment(attachment.id)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 rounded-lg p-1.5 text-white hover:text-rose-400 backdrop-blur-md transition-all active:scale-90">
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Aillame’ye bir şey sorun veya bir görev tanımlayın..."
            className="w-full resize-none appearance-none border-0 !bg-transparent p-0 text-lg font-medium leading-relaxed text-[var(--text-main)] !shadow-none outline-none !ring-0 placeholder:text-[var(--text-muted)] focus:border-0 focus:!bg-transparent focus:outline-none focus:!ring-0"
            style={{ backgroundColor: 'transparent' }}
            disabled={disabled}
            data-landing-prompt="true"
          />

          <div className="relative z-20 flex items-center justify-between mt-4">
            <div className="flex items-center">
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageSelect} className="hidden" />
              <button 
                onClick={() => imageInputRef.current?.click()}
                aria-label="Dosya ekle"
                title="Dosya ekle"
                className="chat-composer-control w-10 h-10 rounded-xl border flex items-center justify-center transition-all group"
              >
                <FiPlus size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <AillameModelSelector />
              <button
                onClick={handleSend}
                disabled={disabled || isEmpty}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-[#a855f7] to-[#60a5fa] flex items-center justify-center text-white shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
              >
                <FiArrowUp size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="chat-composer relative rounded-[26px] overflow-hidden shadow-2xl">
        {attachments.length > 0 && (
          <div className="flex gap-3 px-5 pt-5 pb-2 overflow-x-auto custom-scrollbar bg-white/[0.02]">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative flex items-center gap-3 p-2 pr-10 overflow-hidden rounded-[20px] border border-white/10 bg-black/40 shadow-xl group/img">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/60">
                  <img src={attachment.dataUrl} alt={attachment.name} className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                </div>
                <div className="flex flex-col justify-center min-w-0 max-w-[150px]">
                  <span className="text-xs font-semibold text-white/90 truncate">{attachment.name}</span>
                  <span className="text-[10px] text-white/50 mt-0.5">{attachment.size ? (attachment.size / 1024 / 1024).toFixed(2) + ' MB' : 'Bilinmeyen boyut'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-xl bg-black/80 text-white/80 hover:text-rose-400 backdrop-blur-md border border-white/5 transition-all active:scale-90"
                  aria-label="Görseli kaldır"
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

        {contextBoundary.isPresent && (
          <div className="px-5 py-3 bg-indigo-500/5 border-b border-indigo-500/20 flex gap-3 items-start justify-between">
            <div className="flex gap-3 flex-1 min-w-0">
              <FiInfo size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-indigo-300/80 flex-1 min-w-0">
                <div className="font-semibold">📦 Manuel workspace context</div>
                <div className="mt-1 text-[10px] text-indigo-300/70">
                  {contextBoundary.approximateCharCount} karakter · Gönderiş sırasında metne eklenir
                </div>
                <div className="mt-1 text-[10px] text-indigo-300/60">
                  Nano yalnızca taslakta görünen context'i kullanır; dosyaları otomatik okumaz.
                </div>
                {contextBoundary.warnings.length > 0 && (
                  <div className="mt-1.5 text-[10px] text-amber-300">
                    ⚠️ {getSafeWarningCopy(contextBoundary.warnings[0])}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveContext}
              className="flex-shrink-0 px-2.5 py-1 rounded text-[9px] font-semibold text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20 transition-all active:scale-95"
              aria-label="Context bloğunu taslaktan kaldır"
              title="Kaldır"
            >
              <FiTrash2 size={12} />
            </button>
          </div>
        )}

        {messageAudit.hasManualContext && !messageAudit.isBoundaryIntact && (
          <div className="px-5 py-2.5 bg-rose-500/5 border-b border-rose-500/20 flex gap-2.5 items-start">
            <FiAlertCircle size={13} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-[10px] leading-snug text-rose-300/80 flex-1">
              ⚠️ Context bloğu tamamlanmamış görünüyor. Metni kontrol et.
            </div>
          </div>
        )}

        {injectionWarnings.length > 0 && (
          <div className="px-5 py-2.5 bg-rose-500/5 border-b border-rose-500/20 flex gap-2.5 items-start">
            <FiAlertCircle size={13} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-[10px] leading-snug text-rose-300/80 flex-1">
              🔒 Sistem prompt pattern tespit edildi.
            </div>
          </div>
        )}

        <div className="flex items-end px-2 pb-2 pt-1">
          <div className="flex items-center gap-1 border-r border-[var(--border)] px-2 pb-1.5 pr-3">
            {visionEnabled && (
              <div className="flex-shrink-0">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Görsel ekle"
                  className="chat-composer-control w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90 group/btn"
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
                      : 'chat-composer-control'
                  }`}
                  aria-label={voiceState === 'listening' ? 'Sesli komut durdur' : 'Sesli komut'}
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
            aria-label="Sohbet mesajı"
            disabled={disabled || voiceState === 'listening'}
          />

          <div className="px-3 pb-2.5">
            <button
              id="send-message-btn"
              type="button"
              onClick={handleSend}
              disabled={disabled || isEmpty || voiceState === 'listening'}
              aria-label={isEmpty ? "Yazı veya görsel ekle" : "Gönder"}
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
