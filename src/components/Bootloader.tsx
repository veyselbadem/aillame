'use client';

import dynamic from 'next/dynamic';

// Ağır başlatma bileşenlerini burada Client Component içinde erteliyoruz
const GemmaWarmupOnBoot = dynamic(() => import('@components/GemmaWarmupOnBoot'), { ssr: false });
const OnboardingPanel = dynamic(() => import('@components/OnboardingPanel'), { ssr: false });

export default function Bootloader() {
  return (
    <>
      <GemmaWarmupOnBoot />
      <OnboardingPanel />
    </>
  );
}
