# Aillame Integration Guide

Bu rehber, Aillame'in bir AI Provider olarak dış sistemlere (Doomsgame, BOSS, vb.) nasıl bağlanacağını açıklar.

## 1. Bağlantı Bilgileri

Aillame, standart REST API üzerinden hizmet verir.

- **Base URL:** `http://your-aillame-instance:3000`
- **Auth Header:** `x-aillame-api-key: <API_KEY>` (Veya `Authorization: Bearer <API_KEY>`)

## 2. API Endpointleri

### Health Check
Hizmetin durumunu kontrol eder.
`GET /api/v1/health`

### Capabilities
Desteklenen modları ve görevleri listeler.
`GET /api/v1/capabilities`

### Text Generation
Metin üretimi için kullanılır.
`POST /api/v1/generate`

**Request Body:**
```json
{
  "projectId": "your-project-id",
  "task": "generate_text",
  "input": "Merhaba Aillame!",
  "mode": "general"
}
```

## 3. SDK Kullanımı (TypeScript)

Aillame SDK'sını kullanarak hızlıca entegrasyon yapabilirsiniz.

```typescript
import { AillameClient } from './sdk/aillame-client';

const client = new AillameClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'ail_your_api_key_here'
});

// Health kontrolü
const health = await client.health();
console.log('Status:', health.status);

// Üretim başlatma
const response = await client.generate({
  projectId: 'demo-app',
  task: 'generate_text',
  input: 'Geleceğin yapay zekası hakkında bir cümle yaz.',
  mode: 'general'
});

console.log('AI Response:', response.content);
```

## 4. Rate Limiting (Hız Sınırları)

Aillame, API istemcilerini aşırı kullanıma karşı korumak için hız sınırları (rate limit) uygular. İstemcinin profiline göre dakikalık limitler değişebilir:

- **Low:** 5 req/min
- **Standard:** 30 req/min
- **Trusted:** 120 req/min
- **Unlimited Local:** 10,000 req/min

Sınır aşıldığında API **429 Too Many Requests** hatası döner:

```json
{
  "success": false,
  "provider": "aillame",
  "error": "Rate limit aşıldı. Lütfen daha sonra tekrar deneyin."
}
```

### Güvenlik Uyarısı
API anahtarınızı doğrudan frontend (tarayıcı) tarafına gömmeyin. Bu anahtarın çalınmasına yol açabilir. Her zaman kendi backend'iniz üzerinden bir **Proxy** kullanarak Aillame'e istek atın.

## 5. Nano Training Pipeline

Aillame, dışarıdan gelen verilerle eğitilebilir bir yapıya sahiptir. Admin panelinden onaylanan geri bildirimler, `nano-training` pipeline'ı üzerinden modelin gelişimine katkı sağlar.

### Eğitim Verisi Export
`POST /api/admin/nano-training/export` (Admin token gerektirir)

Bu endpoint, onaylanmış ve düşük riskli verileri eğitim için hazır formatta döndürür.
