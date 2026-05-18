'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowUp,
  FiCode,
  FiEdit3,
  FiGlobe,
  FiImage,
  FiPlus,
  FiStar,
  FiX,
} from 'react-icons/fi';
import { AillameModelSelector } from './AillameModelSelector';
import { QuickActionCard } from './QuickActionCard';
import type { ImageAttachment } from '@apptypes/attachments';
import { createImageAttachment, validateImageFile } from '@/lib/image-attachments';

interface LandingViewProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  attachments: ImageAttachment[];
  onAttachmentsChange: (attachments: ImageAttachment[]) => void;
  visionEnabled?: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  input,
  setInput,
  onSend,
  disabled,
  attachments = [],
  onAttachmentsChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const quickActions = useMemo(
    () => [
      {
        icon: FiEdit3,
        title: 'Yazı Yaz',
        description: 'Metin, makale veya içerik oluşturun.',
        iconBg: 'bg-purple-500/20 text-purple-300 border-purple-400/20',
        prompt: 'Benim için bir metin hazırla: ',
      },
      {
        icon: FiImage,
        title: 'Görsel Üret',
        description: 'AI ile özgün görseller oluşturun.',
        iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/20',
        prompt: 'Şu görseli üret: ',
      },
      {
        icon: FiGlobe,
        title: "Web'de Ara",
        description: 'Güncel bilgilere ulaşın.',
        iconBg: 'bg-blue-500/20 text-blue-300 border-blue-400/20',
        prompt: "Web'de şunu araştır: ",
      },
      {
        icon: FiCode,
        title: 'Kod Yaz',
        description: 'Kod yazın, hataları çözün, geliştirin.',
        iconBg: 'bg-amber-500/20 text-amber-300 border-amber-400/20',
        prompt: 'Şu kod görevinde yardımcı ol: ',
      },
    ],
    [],
  );

  const isEmpty = !input.trim() && attachments.length === 0;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [input]);

  const focusPrompt = () => {
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    if (disabled || isEmpty) return;
    onSend();
    window.setTimeout(focusPrompt, 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setImageError(null);

    try {
      const nextAttachments: ImageAttachment[] = [];
      for (const file of files.slice(0, 4)) {
        const validation = validateImageFile(file);
        if (validation) throw new Error(validation);
        nextAttachments.push(await createImageAttachment(file));
      }
      onAttachmentsChange([...attachments, ...nextAttachments].slice(0, 4));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Görsel eklenemedi.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((attachment) => attachment.id !== id));
  };

  const applyQuickAction = (prompt: string) => {
    setInput(prompt);
    window.setTimeout(focusPrompt, 0);
  };

  return (
    <section className="chat-landing relative h-full overflow-y-auto px-5 pb-14 pt-[120px] custom-scrollbar sm:px-8 lg:pt-[150px]">
      <div className="pointer-events-none absolute inset-0 neural-grid opacity-60" />
      <div className="chat-ambient pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-col items-center">
        <div className="mb-10 text-center animate-fade-in sm:mb-11">
          <FiStar className="mx-auto mb-4 text-purple-500 dark:text-purple-300 sparkle-glow" size={32} />
          <h1 className="bg-gradient-to-r from-purple-400 via-indigo-400 to-sky-400 bg-clip-text text-[64px] font-extrabold leading-none text-transparent sm:text-[80px] lg:text-[96px]">
            Aillame
          </h1>
          <p className="mt-4 text-lg font-medium text-[var(--text-secondary)] sm:text-xl">
            Yerel, güçlü ve size özel AI asistanınız.
          </p>
        </div>

        <div className="relative z-30 w-full animate-fade-in" style={{ animationDelay: '0.08s' }}>
          <div className="chat-composer-shell group relative w-full rounded-[29px] p-[1px] shadow-[0_24px_80px_rgba(15,23,42,0.16),0_0_42px_rgba(96,165,250,0.12)] transition-shadow group-focus-within:shadow-[0_24px_80px_rgba(15,23,42,0.18),0_0_70px_rgba(139,92,246,0.22)]">
            <div className="chat-composer relative min-h-[170px] overflow-visible rounded-[28px] p-5 backdrop-blur-xl sm:p-7">
              {attachments.length > 0 && (
                <div className="mb-4 flex gap-3 overflow-x-auto custom-scrollbar">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="group/attachment relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border bg-black/30"
                    >
                      <img src={attachment.dataUrl} alt={attachment.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/70 text-white/80 backdrop-blur transition hover:text-rose-300"
                        aria-label="Görseli kaldır"
                        title="Görseli kaldır"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {imageError && (
                <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-rose-300">
                  {imageError}
                </div>
              )}

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Aillame'ye bir şey sorun veya bir görev tanımlayın..."
                className="block min-h-[78px] w-full resize-none appearance-none border-0 !bg-transparent p-0 text-[17px] font-medium leading-relaxed text-[var(--text-main)] !shadow-none outline-none !ring-0 placeholder:text-[var(--text-muted)] focus:border-0 focus:!bg-transparent focus:outline-none focus:!ring-0 sm:text-lg"
                style={{ backgroundColor: 'transparent' }}
                disabled={disabled}
                aria-label="Aillame istemi"
                data-landing-prompt="true"
              />

              <div className="relative z-20 mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="chat-composer-control flex h-12 w-12 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Dosya ekle"
                    title="Dosya ekle"
                  >
                    <FiPlus size={24} />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <AillameModelSelector />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={disabled || isEmpty}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-xl shadow-blue-500/20 transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:grayscale"
                    aria-label="Gönder"
                    title="Gönder"
                  >
                    <FiArrowUp size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="relative z-0 mt-8 flex w-full flex-wrap items-center justify-center gap-4 animate-fade-in"
          style={{ animationDelay: '0.16s' }}
        >
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.title}
              icon={action.icon}
              title={action.title}
              description={action.description}
              iconBg={action.iconBg}
              onClick={() => applyQuickAction(action.prompt)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
