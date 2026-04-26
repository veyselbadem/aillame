'use client';

import { useState } from 'react';
import { FiThumbsUp, FiThumbsDown, FiSend, FiCheckCircle, FiMessageCircle, FiStar } from 'react-icons/fi';

type FeedbackType = 'like' | 'dislike' | null;

const FEEDBACK_TOPICS = [
  'Yanıt kalitesi',
  'Hız ve performans',
  'Arayüz tasarımı',
  'Bellek / hafıza özelliği',
  'Genel deneyim',
  'Diğer',
];

export default function FeedbackPage() {
  const [selected, setSelected] = useState<FeedbackType>(null);
  const [topic, setTopic] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!selected) return;
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: `general-${Date.now()}`,
          conversationId: 'general-feedback',
          selectedFeedback: selected,
          optionalComment: `[Konu: ${topic || 'Belirtilmedi'}] [Puan: ${rating}/5] ${comment}`.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Gönderim başarısız.');

      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Bir hata oluştu.');
      setStatus('error');
    }
  };

  const reset = () => {
    setSelected(null);
    setTopic('');
    setComment('');
    setRating(0);
    setStatus('idle');
    setErrorMsg('');
  };

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col animate-fade-in px-4 pt-8 md:pt-12 pb-8">

        {/* ── Header ── */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
              <FiMessageCircle size={10} />
              Kullanıcı Geri Bildirimi
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">
            <span className="text-gradient">Feedback</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2 max-w-lg leading-relaxed">
            Aillame'yi daha iyi hale getirmemize yardım et. Deneyimini bizimle paylaş.
          </p>
        </header>

        {status === 'success' ? (
          /* ── Success State ── */
          <div className="glass-card rounded-[32px] p-10 flex flex-col items-center gap-5 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FiCheckCircle size={32} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">Geri Bildirimin Alındı!</h2>
              <p className="text-gray-500 text-sm">Katkın için teşekkürler. Her geri bildirim Aillame'yi daha iyi yapıyor.</p>
            </div>
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-bold hover:bg-indigo-600/30 transition-all"
            >
              Yeni Geri Bildirim
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div className="glass-card rounded-[32px] p-6 sm:p-8 flex flex-col gap-6">

            {/* Step 1: Like / Dislike */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-3">Genel Deneyim</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelected('like')}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl border transition-all font-bold text-sm ${
                    selected === 'like'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400'
                  }`}
                >
                  <FiThumbsUp size={18} />
                  Beğendim
                </button>
                <button
                  onClick={() => setSelected('dislike')}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl border transition-all font-bold text-sm ${
                    selected === 'dislike'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-rose-500/30 hover:text-rose-400'
                  }`}
                >
                  <FiThumbsDown size={18} />
                  Geliştirilebilir
                </button>
              </div>
            </div>

            {/* Step 2: Star Rating */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-3">Puan (1-5)</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-all"
                    aria-label={`${star} yıldız`}
                  >
                    <FiStar
                      size={28}
                      className={`transition-all ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Topic */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-3">Konu</p>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t === topic ? '' : t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      topic === t
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                        : 'bg-white/[0.03] border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Comment */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-3">Yorum (İsteğe Bağlı)</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Düşüncelerini buraya yaz..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm dark:text-gray-200 text-gray-800 placeholder:text-gray-600 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/15 transition-all"
              />
            </div>

            {/* Error */}
            {status === 'error' && errorMsg && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!selected || status === 'submitting'}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              <FiSend size={15} />
              {status === 'submitting' ? 'Gönderiliyor...' : 'Geri Bildirim Gönder'}
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
