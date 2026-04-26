import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aillame AI | Yerel ve Güçlü Yapay Zeka Deneyimi',
  description: 'Aillame, Rust ve TypeScript ile sıfırdan inşa edilmiş, yerel işlemci gücünü kullanan, yüksek performanslı ve gizlilik odaklı bir yapay zeka asistanıdır.',
  keywords: ['AI', 'Yapay Zeka', 'Aillame', 'Rust AI', 'TypeScript', 'Chatbot', 'Yerel AI', 'Machine Learning'],
  authors: [{ name: 'Aillame Team' }],
  openGraph: {
    title: 'Aillame AI',
    description: 'Yeni nesil yerel yapay zeka asistanı.',
    url: 'https://aillame.ai',
    siteName: 'Aillame',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aillame AI',
    description: 'Rust Powered Local AI Engine',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#07070f',
  width: 'device-width',
  initialScale: 1,
};

import MainLayout from '@components/MainLayout';
import { ChatProvider } from '@providers/ChatProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen transition-colors duration-500 font-sans antialiased text-gray-200">
        <ChatProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </ChatProvider>
      </body>
    </html>
  );
}
