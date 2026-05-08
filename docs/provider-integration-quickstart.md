# Provider Integration Quickstart

## Base URL

Yerel geliştirme:

```text
http://localhost:3000/api/provider/v1
```

## Auth header

```text
Authorization: Bearer YOUR_AILLAME_API_KEY
```

## Status endpoint

```http
GET /api/provider/v1/status
Authorization: Bearer YOUR_AILLAME_API_KEY
```

Başarılı cevap runtime readiness, text/image durumu ve blocker listesini döndürür.

## Models endpoint

```http
GET /api/provider/v1/models
Authorization: Bearer YOUR_AILLAME_API_KEY
```

Bu endpoint kullanılabilir yerel LLM ve IGM modellerini status bilgisiyle listeler.

## Text generate örneği

```http
POST /api/provider/v1/generate
Authorization: Bearer YOUR_AILLAME_API_KEY
Content-Type: application/json
```

```json
{
  "projectId": "boss-ai",
  "mode": "text",
  "taskType": "analysis",
  "prompt": "Summarize the current project status for a beta user.",
  "options": {
    "temperature": 0.7,
    "maxTokens": 512
  }
}
```

## Image generate örneği

```http
POST /api/provider/v1/generate
Authorization: Bearer YOUR_AILLAME_API_KEY
Content-Type: application/json
```

```json
{
  "projectId": "doomsgame-engine",
  "mode": "image",
  "prompt": "Low-poly fantasy arena concept, local beta preview",
  "options": {
    "width": 512,
    "height": 512,
    "steps": 1,
    "seed": 1234
  }
}
```

## BOSS AI için kullanım

BOSS AI entegrasyonunda `projectId` değeri `boss-ai` olmalıdır. Text generation için kısa, görev odaklı prompt kullanın ve response içindeki `success` alanını kontrol edin.

## Doomsgame Engine için kullanım

Doomsgame Engine entegrasyonunda `projectId` değeri `doomsgame-engine` olmalıdır. Image generation isteklerinde placeholder veya degraded sonuçları product health ile birlikte değerlendirin.

## Hata kodları

- `UNAUTHORIZED`: Auth header eksik veya geçersiz.
- `INVALID_REQUEST`: JSON payload veya alanlar geçersiz.
- `RUNTIME_NOT_READY`: Yerel LLM veya IGM runtime hazır değil.
- `500`: Beklenmeyen provider service hatası.

## Güvenlik notları

- Gerçek API key commit edilmez.
- Provider requestlerinde secret veya absolute local path gönderilmez.
- Model dosyaları ve generated assetler repo dışında tutulur.
- Cloud fallback bu RC kapsamında eklenmemiştir.
