# Aillame

Aillame, yerel ve harici çalışma kiplerini bir araya getiren, local-first merkezi AI provider katmanıdır.
BOSS AI, Doomsgame Engine ve Badem Akademi gibi projelerin LLM ihtiyaçlarını tek noktadan karşılar.

## Geliştirme Komutları

```bash
npm run dev        # Geliştirme sunucusunu başlat (http://localhost:3000)
npm run build      # Production build (next build --webpack)
npm run lint       # TypeScript tip kontrolü (tsc --noEmit)
npm run smoke:external-api  # External API smoke testi (local server çalışır olmalı)
```

## External Provider Quick Start

- Base URL: `http://localhost:3000/api/v1`
- Auth: `Authorization: Bearer <AILLAME_EXTERNAL_API_KEY>`
- Uyumlu endpointler:
  - `GET /api/v1/models`
  - `POST /api/v1/chat/completions`

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

Ayrıntılı entegrasyon örnekleri: [docs/external-api.md](docs/external-api.md)

## Admin Paneli

| Sayfa | Adres |
|---|---|
| Admin giriş | http://localhost:3000/admin/login |
| Model Library | http://localhost:3000/admin/model-library |
| AI Lab | http://localhost:3000/admin |

### Model Library ve Varsayılan Model Seçimi

`/admin/model-library` sayfasından `text`, `code`, `image`, `vision`, `embedding` kapasiteleri için
varsayılan model atanabilir. Tercihler `data/model-library/preferences.json` dosyasında saklanır
(gitignore altında, commit'e alınmaz).

### Runtime Diagnostics

Model seçim kararları `data/ai-lab/runtime-events.json` dosyasına (max 100 event, gitignore altında)
yazılır. `GET /api/admin/ai-lab/runtime-events?limit=20` endpoint'i ile sorgulanabilir.

### Gemma Switch Preflight

`POST /api/admin/model-library/gemma-switch-preflight` ile GGUF model değiştirme öncesi
güvenlik ön kontrolü yapılabilir (`dryRun: true` zorunlu). Gerçek switching henüz aktif değil.

## Smoke Test

```bash
AILLAME_EXTERNAL_API_KEY=your-key npm run smoke:external-api
```

Sunucu kapalıysa "Local server is not reachable" mesajı alınır.

## Production Notları

- `.env` dosyasını commit'leme; `.env.example` şablonunu kullan.
- `AILLAME_ADMIN_TOKEN` sunucu tarafında korunur; NEXT_PUBLIC_ prefix'li değişkenler istemci tarafında görünür olduğundan gerçek gizlilik sağlamaz.
- Rate limiting varsayılan olarak devre dışıdır (`AILLAME_EXTERNAL_API_RATE_LIMIT_ENABLED`). Production'da etkinleştir.
- Rate limit in-memory çalışır; serverless/multi-instance dağıtımlarda paylaşımsız olur.
- Model dosyaları (`.gguf`, `.safetensors` vb.) repoya commit'lenmemeli; dış model klasörüne (`AILLAME_MODEL_ROOT`) konulmalı.

## Güvenlik Notları

- API key ve token değerleri loglara yazılmaz.
- `metadata` içindeki `apiKey`, `token`, `secret`, `password` anahtar içeren alanlar otomatik filtrelenir.
- Smoke test çıktısı API key değerini göstermez.

## Known Limitations

- Gemma switching: yalnızca dry-run/preflight seviyesinde; gerçek model değişimi henüz aktif değil.
- Model install/delete: güvenli şekilde ertelenmiştir; sahte endpoint yoktur.
- Rate limit: in-memory, best-effort; restart'ta sıfırlanır.
- Model library: varsayılan model tercihleri `data/` altında lokal saklanır; şema değişimlerine karşı migration yoktur.

## Release Checklist

Sürüm hazırlığı için: [docs/release-checklist.md](docs/release-checklist.md)
