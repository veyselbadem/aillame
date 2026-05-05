# Aillame External API

Bu doküman, Aillame'i başka projelerin LLM provider'ı olarak bağlamak için gerekli temel sözleşmeyi açıklar.

## Base URL

- Local default: http://localhost:3000/api/v1

## Auth

- Environment variable: AILLAME_EXTERNAL_API_KEY
- Supported headers:
  - Authorization: Bearer <key>
  - x-aillame-api-key: <key>

## OpenAI-Compatible Endpoints

- GET /api/v1/models
- POST /api/v1/chat/completions

## Request Context Contract

Aillame aşağıdaki alanları güvenli şekilde normalize eder:

- projectId
- mode
- context
- metadata
- sessionId
- userId

Notlar:
- projectId ve mode şu an diagnostics/context amaçlı normalize edilir.
- Prompt veya mesaj içeriği runtime diagnostics event log'a yazılmaz.
- metadata içinde apiKey, token, secret, password benzeri anahtarlar filtrelenir.

## Provider Config Examples

### BOSS AI

```json
{
  "provider": "aillame",
  "baseUrl": "http://localhost:3000/api/v1",
  "apiKey": "your-aillame-key",
  "model": "aillame-default",
  "projectId": "boss-ai",
  "mode": "economy"
}
```

### Doomsgame Engine

```json
{
  "provider": "aillame",
  "baseUrl": "http://localhost:3000/api/v1",
  "apiKey": "your-aillame-key",
  "model": "aillame-default",
  "projectId": "doomsgame-engine",
  "mode": "game"
}
```

Alternatif olarak Doomsgame Engine için mode code da kullanılabilir.

### Badem Akademi

```json
{
  "provider": "aillame",
  "baseUrl": "http://localhost:3000/api/v1",
  "apiKey": "your-aillame-key",
  "model": "aillame-default",
  "projectId": "badem-akademi",
  "mode": "education"
}
```

## Smoke Test

```bash
npm run smoke:external-api
```

Opsiyonel environment değişkenleri:

- AILLAME_EXTERNAL_API_BASE_URL
- AILLAME_EXTERNAL_API_KEY

## Current Limitations

- Gerçek Gemma switching henüz dry-run/preflight seviyesindedir.
- Model install/delete güvenli şekilde ertelenmiştir.
- Rate limit in-memory ve best-effort çalışır; serverless dağıtımlarda paylaşımsız olabilir.
- API key veya başka secret değerleri loglara yazılmamalıdır.
