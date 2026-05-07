# Aillame Provider SDK Examples

Aillame Provider SDK, harici uygulamaların Aillame Hub'a güvenli ve proje bazlı bağlanmasını sağlar.

## Kurulum
```bash
# Gelecekte npm üzerinden
npm install @aillame/provider-sdk
```

## BOSS AI - Finansal Analiz Entegrasyonu
```typescript
import { AillameClient } from './src/core/sdk/aillame-client';

const client = new AillameClient({
  baseUrl: process.env.AILLAME_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.AILLAME_API_KEY, // 'ail_...' formatında anahtar
  projectId: 'boss-ai',
  mode: 'economy',
  sourceApp: 'boss-ai'
});

async function analyzeMarket() {
  try {
    const response = await client.chat({
      message: 'Bugünkü piyasa sinyallerini analiz et.',
      taskType: 'market-analysis'
    });
    console.log('Analiz:', response.answer);
  } catch (error) {
    // 401: Invalid Key, 403: Forbidden Scope, 429: Rate Limit
    console.error('Entegrasyon Hatası:', error.message);
  }
}
```

## Doomsgame Engine - Kod Asistanı Entegrasyonu
```typescript
const client = new AillameClient({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.AILLAME_API_KEY,
  projectId: 'doomsgame-engine',
  mode: 'code',
  sourceApp: 'doomsgame-engine'
});

async function requestRefactorPlan() {
  const response = await client.task({
    taskType: 'code-plan',
    message: 'Physics engine için performans optimizasyon planı hazırla.'
  });
  console.log('Plan ID:', response.id);
}
```

## Badem Akademi - Eğitim İçeriği Üretimi
```typescript
const client = new AillameClient({
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.AILLAME_API_KEY,
  projectId: 'badem-akademi',
  mode: 'education',
  sourceApp: 'badem-akademi'
});

async function generateWorksheet() {
  const response = await client.chat({
    message: 'Güneş sistemi hakkında 5 soruluk test oluştur.',
    taskType: 'worksheet-generation'
  });
  console.log('Etkinlik:', response.answer);
}
```
