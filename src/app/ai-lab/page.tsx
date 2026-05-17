'use client';

import { FiCpu, FiDatabase, FiMessageSquare, FiStar } from 'react-icons/fi';

const labCards = [
  {
    title: 'Feedback Havuzu',
    icon: FiMessageSquare,
    copy: 'Kullanıcı geri bildirimleri yapay zekâ davranışlarını iyileştirmek için deney adaylarına dönüştürülecek.',
  },
  {
    title: 'Prompt Testleri',
    icon: FiStar,
    copy: 'Prompt denemeleri, sohbet davranışları ve üretken AI akışları burada sınanacak.',
  },
  {
    title: 'AI Araçları',
    icon: FiDatabase,
    copy: 'Model denemeleri, araç çıktıları ve deneysel yapay zekâ özellikleri burada yönetilecek.',
  },
  {
    title: 'Model Deneyleri',
    icon: FiCpu,
    copy: 'Yerel modeller, yanıt kalitesi ve deneysel AI fonksiyonları bu alanda izlenecek.',
  },
];

export default function AiLabPage() {
  return (
    <section className="theme-shell relative min-h-screen overflow-y-auto px-6 py-16 custom-scrollbar">
      <div className="pointer-events-none absolute inset-0 neural-grid opacity-50" />
      <div className="chat-ambient pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-purple-200">
            <FiCpu size={15} />
            Yerel AI
          </div>
          <h1 className="bg-gradient-to-r from-purple-300 via-indigo-300 to-sky-300 bg-clip-text text-5xl font-extrabold leading-none text-transparent sm:text-7xl">
            AI Lab
          </h1>
          <p className="mt-5 text-xl font-semibold theme-secondary">
            Yapay zekâ araçlarını ve deneysel özellikleri yönetin.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 theme-muted">
            Model denemeleri, prompt testleri, üretken AI özellikleri, sohbet davranışları ve deneysel AI fonksiyonları AI Lab altında toplanır.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {labCards.map((card) => (
            <div
              key={card.title}
              className="theme-surface rounded-[18px] p-5 shadow-xl backdrop-blur-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-500/15 text-purple-200">
                <card.icon size={22} />
              </div>
              <h2 className="text-base font-bold theme-title">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 theme-muted">{card.copy}</p>
            </div>
          ))}
        </div>

        <div className="theme-soft-panel rounded-[20px] border border-dashed p-6 text-sm leading-7 theme-muted">
          Bu ekran AI deneylerini düzenlemek için ayrılmıştır; hızlı uyumluluk ve sistem kontrolleri Nano Lab altında yürütülür.
        </div>
      </div>
    </section>
  );
}
