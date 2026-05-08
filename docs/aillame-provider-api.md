# Aillame Local AI Provider API

Aillame, dış projelerin (BOSS AI, Doomsgame Engine vb.) yerel AI yeteneklerini (LLM & IGM) kullanabilmesi için güvenli bir Provider API sunar.

## Temel Bilgiler
- **Base URL**: `http://localhost:3000/api/provider/v1`
- **Auth**: `x-aillame-api-key` header'ı veya `Authorization: Bearer <key>` kullanılır.

## 1. Sistem Durumu (Status)
Sistemin ve modellerin hazır olup olmadığını kontrol eder.

**İstek:**
`GET /status`

**Yanıt:**
```json
{
  "success": true,
  "provider": "aillame-local",
  "status": {
    "ready": true,
    "text": "READY",
    "image": "READY"
  },
  "diagnostics": {
    "device": "NVIDIA GeForce RTX 5060 (CPU Fallback)",
    "cpuFallback": true
  }
}
```

## 2. Model Listesi (Models)
Kullanılabilir yerel modelleri listeler.

**İstek:**
`GET /models`

## 3. Üretim (Generate)
Metin veya görsel üretimi için ana endpoint.

### Metin Üretimi (Text Generation) - BOSS AI Örneği
**İstek:** `POST /generate`
```json
{
  "projectId": "boss-ai",
  "mode": "text",
  "taskType": "analysis",
  "prompt": "Bugünkü finansal haberleri özetle.",
  "options": {
    "temperature": 0.7,
    "maxTokens": 512
  }
}
```

### Görsel Üretimi (Image Generation) - Doomsgame Engine Örneği
**İstek:** `POST /generate`
```json
{
  "projectId": "doomsgame-engine",
  "mode": "image",
  "prompt": "pixel art dragon boss icon, high quality",
  "options": {
    "width": 512,
    "height": 512,
    "steps": 1,
    "seed": 1234
  }
}
```

**Yanıt:**
```json
{
  "success": true,
  "provider": "aillame-local",
  "projectId": "doomsgame-engine",
  "mode": "image",
  "runtime": {
    "type": "igm",
    "local": true,
    "modelId": "sdxl-turbo",
    "device": "CPU Fallback",
    "degraded": false,
    "placeholderUsed": false
  },
  "output": {
    "imageUrl": "data:image/png;base64,...",
    "assetId": "asset_1778241956552"
  },
  "diagnostics": {
    "finalAcceptanceReady": true,
    "reason": "REAL_IGM_GENERATION_SUCCEEDED"
  }
}
```

## Güvenlik Notları
- `projectId` değerleri otomatik olarak normalize edilir (küçük harf, rakam ve tire).
- Gerçek yerel üretim yapılmadığında (placeholder kullanıldığında) `success` değeri `false` döner.
- Donanım kısıtları (CPU Fallback) `runtime.device` alanında şeffafça raporlanır.
