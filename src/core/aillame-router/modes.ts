import type { AillameMode, AillameModeDefinition } from './types';

export const AILLAME_MODES: readonly AillameModeDefinition[] = [
  {
    id: 'general',
    label: 'Genel',
    description: 'Genel sohbet, tasarım, planlama, yaratıcılık ve alanlar arası görevler.',
    keywords: [
      'genel',
      'plan',
      'tasarım',
      'yaratıcı',
      'özet',
      'açıkla',
      'fikir',
      'strateji',
      'sosyal medya',
      'afiş',
      'poster',
      'kapak',
    ],
  },
  {
    id: 'education',
    label: 'Eğitim',
    description: 'Öğrenme, ders, etkinlik, sınav, öğretmen ve öğrenci odaklı işler.',
    keywords: [
      'eğitim',
      'ders',
      'öğrenci',
      'öğretmen',
      'matematik',
      'fen',
      'sınav',
      'etkinlik',
      'ödev',
      'müfredat',
      'konu anlatımı',
      'quiz',
      'test',
    ],
  },
  {
    id: 'code',
    label: 'Kod',
    description: 'Yazılım, hata ayıklama, mimari, terminal, framework ve kod inceleme işleri.',
    keywords: [
      'kod',
      'react',
      'typescript',
      'javascript',
      'python',
      'bug',
      'hata',
      'debug',
      'fonksiyon',
      'component',
      'api',
      'terminal',
      'build',
      'refactor',
      'script',
      'scripting',
      'kodla',
      'collision',
    ],
  },
  {
    id: 'economy',
    label: 'Ekonomi',
    description: 'Piyasa, ekonomi, finans, kripto ve risk analizi işleri.',
    keywords: [
      'ekonomi',
      'finans',
      'yatırım',
      'borsa',
      'hisse',
      'kripto',
      'bitcoin',
      'ethereum',
      'dolar',
      'faiz',
      'enflasyon',
      'risk analizi',
      'portföy',
      'al sat',
    ],
  },
] as const;

export const DEFAULT_AILLAME_MODE: AillameMode = 'general';

export function getModeDefinition(mode: AillameMode): AillameModeDefinition {
  const definition = AILLAME_MODES.find((item) => item.id === mode);
  if (!definition) {
    return AILLAME_MODES[0];
  }
  return definition;
}
