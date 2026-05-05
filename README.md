# Aillame

Aillame, yerel ve harici çalışma kiplerini bir araya getiren merkezi AI provider katmanıdır.

## External Provider Quick Start

- Base URL: http://localhost:3000/api/v1
- Auth: Authorization: Bearer <AILLAME_EXTERNAL_API_KEY>
- Uyumlu endpointler:
  - GET /api/v1/models
  - POST /api/v1/chat/completions

## Provider Config Example

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

## Smoke Test

```bash
npm run smoke:external-api
```

Ayrıntılı entegrasyon notları için [docs/external-api.md](docs/external-api.md) dosyasına bakın.
