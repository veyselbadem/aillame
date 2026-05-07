# Aillame Local AI Hub

Aillame, yerel ve harici çalışma kiplerini bir araya getiren, local-first merkezi bir AI provider katmanıdır (Local AI Hub).
Farklı projelerin (BOSS AI, Badem Akademi vb.) LLM, RAG, Code Agent ve Multimodal ihtiyaçlarını tek noktadan güvenle karşılar.

## Aktif Foundation Katmanları (Phase 1-5)

Aillame artık deneysel bir modül toplamı değil, beta seviyesine hazırlanan bir üründür:
- **Local Text Runtime**: GGUF/WASM/Ollama modellerini yerel, hızlı ve güvenli çalıştırır.
- **External Provider API**: OpenAI uyumlu (/api/v1/chat/completions) ve projelere özel endpointler sağlar.
- **Project Memory**: Projelere izole edilmiş, kalıcılık stratejisi tanımlanmış (Phase 5) hafıza modülü.
- **Code Agent**: Otonom işlemleri sadece plan seviyesinde (plan-only) tutan güvenlik katmanı. Kullanıcı onayı (approval-gated) gerektirir.
- **Image Workflow**: Görsel üretim işlerini (job queue) yönetir. (SDXL vs. adapter iskeletleri hazırdır).
- **RAG & Vector Memory**: Doküman yükleme (ingestion) ve vektörel hafıza temelidir.
- **Nano Intelligence**: Kendi kendine öğrenme döngüsü (geri bildirim mekanizması), sistem tavsiyesi (advisory) üretir, otonom kararları kısıtlar.
- **CLI & Security**: Yeni eklenen CLI foundation, Audit log, API Key permission mekanizmaları.

## CLI Kullanımı (Yeni)

Aillame'i yerel terminalinizden güvenle yönetebilirsiniz:

```bash
npm run cli:aillame status
npm run cli:aillame health
npm run cli:aillame projects
```

CLI tamamen "plan-only" çalışır; izinsiz dosya yazma veya destructive eylem gerçekleştirmez.

## Geliştirme Komutları & Smoke Testler

Projeyi doğrulamak için çeşitli katman testlerimiz mevcuttur:

```bash
npm run typecheck
npm run build
npm run smoke:foundation
npm run smoke:project-provider
npm run smoke:code-agent
npm run smoke:image-rag-nano
npm run smoke:productization
npm run smoke:external-api
```

## Security & Production Notları

- **Dev vs. Production**: Development modunda API Key zorunluluğu esnek tutulabilir, ancak `NODE_ENV=production` iken kimlik doğrulama zorunludur.
- **API Key & İzinler**: API anahtarları `chat:read`, `memory:write` gibi spesifik izinlere bağlanabilir.
- **Audit Logging**: Kritik işlemler (ör: memory write, task plan) sanitize edilerek loglanır. Şifreler veya secret değerler ASLA loglara yansımaz.
- **Rate Limit**: Gelen API çağrıları için in-memory (ileride redis/sqlite) limitler mevcuttur.
- `.env` dosyasını commit'leme; `.env.example` şablonunu kullan.
