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

## Beta UI Integration & Foundation Belgelendirmesi

Aillame'in admin paneli, Phase 5 productization özelliklerini yansıtacak şekilde genişletilmiştir:
- Admin Dashboard üzerinden Health, Beta Readiness ve Desktop Boot statüleri izlenebilir.
- Security paneli, Audit Log ve API Key yetkileri şeffaf şekilde listelenir.
- Agent Task'leri, "plan-only" çalışma mantığını açıkça belirtir.
- Hafıza sayfaları, in-memory durumunu ve gelecekteki SQLite/JSONL persistence stratejisini açıklar.

Detaylı belgeler için aşağıdaki dokümanlara göz atın:
- [Desktop Readiness Stratejisi](docs/desktop-readiness.md)
- [Kalıcı Hafıza (Persistent Memory) Stratejisi](docs/persistent-memory-strategy.md)
- [Beta Readiness Checklist](docs/beta-readiness-checklist.md)

## Post-Beta Phase 1: Persistent File Storage & Live Health Binding

Aillame artık bellek durumunu ve sistem sağlığını in-memory seviyesinden dosya tabanlı (JSONL) kalıcı depolamaya ve canlı izleme yapısına taşımıştır:
- **Storage Root:** Tüm kalıcı veriler varsayılan olarak `.aillame-data/` klasörüne yazılır (veya `AILLAME_DATA_DIR` env değişkeni ile ezilebilir).
- **Project Memory & Vector Store:** Artık JSONL tabanlı `File-Store` adaptörleri üzerinden okunup yazılır. Her okuma ve yazma işleminde Project Isolation kuralları korunur ve veriler otomatik olarak sterilize edilir.
- **Live Health Binding:** `/api/aillame/health` endpoint'i ve Admin Dashboard artık gerçek zamanlı aggregator üzerinden storage diagnostics verilerini okur.

Smoke testi için:
```bash
npm run smoke:persistent-storage
```

## Post-Beta Phase 2: API Security Hardening & Key Management

Aillame, External Provider API yüzeyini gerçek projeler için sertleştirmiştir:
- **Hashed API Keys:** API anahtarları plaintext olarak saklanmaz; SHA-256 HMAC ile hashlenerek `.aillame-data/api-keys.jsonl` içinde tutulur.
- **Project-Scoped Permissions:** Her anahtar belirli projelere (`projectId`) ve yetki kapsamlarına (`scopes`: chat:write, project:read vb.) kısıtlanabilir.
- **External Auth Guard:** Tüm `/api/external/v1/*` endpointleri API key kontrolü ve yetki denetiminden geçer.
- **Rate Limiting:** Identifier tabanlı (API Key veya IP) istek sınırlama mekanizması devreye alınmıştır.
- **Admin UI Control:** Admin paneli üzerinden yeni anahtar üretimi, iptali (revocation) ve güvenlik statüsü izlenebilir.

Security smoke testi için:
```bash
npm run smoke:security-api-keys
```

## Post-Beta Phase 3: External Provider E2E Integration

Aillame, harici projeler için hazır bir provider katmanı haline getirilmiştir:
- **Integration Contracts:** BOSS AI, Doomsgame Engine ve Badem Akademi için typed entegrasyon sözleşmeleri tanımlandı (`src/core/integrations/contracts`).
- **E2E Smoke Tests:** External Provider API ve OpenAI-compatible endpoint'ler için E2E doğrulama zinciri oluşturuldu.
- **SDK Examples:** Proje bazlı SDK kullanım örnekleri ve hata handling senaryoları dokümante edildi.
- **Admin Visibility:** Admin panelinde entegrasyon hazırlık durumu ve contract statüleri görünür hale getirildi.

Provider E2E testi için:
```bash
npm run smoke:provider-e2e
```

## Post-Beta Phase 4: Code Agent Approval + Patch Workflow

Code Agent, plan-only seviyesinden güvenli yama (patch) uygulama seviyesine taşındı:
- **Approval-Gated Workflow:** Herhangi bir dosya yazma veya komut çalıştırma işlemi için açık kullanıcı onayı (Approval Token) şart koşuldu.
- **Safe Patch Apply:** Yama uygulama işlemi öncesinde `dry-run` ve `preview-only` modları eklendi; hassas dosyalar (.env, keys vb.) otomatik olarak bloklandı.
- **Verifier Allowlist:** Yama sonrası doğrulama komutları (`npm run build`, `typecheck` vb.) için sıkı bir allowlist ve kabuk operatörü (shell operator) denetimi getirildi.
- **Unified Diff Preview:** Kullanıcıya yapılacak değişiklikler, gizli bilgiler (secret) temizlenmiş ve renklendirilmiş diff formatında sunulur.
- **Audit & Rollback:** Tüm yama süreçleri audit log'a kaydedilir ve geri alma (rollback) notları oluşturulur.

Code Agent Patch testi için:
```bash
npm run smoke:code-agent-patch-workflow
```

## Post-Beta Phase 5: Live Runtime + Model Discovery

Aillame, yerel model yönetimi ve runtime hazırlığı tarafında ürün seviyesine taşındı:
- **Model Discovery:** Yerel GGUF modellerini otomatik keşfetme ve watchlist üzerinden takip etme özelliği eklendi.
- **GGUF Detector:** Model dosyalarından quantization (Q4_K_M, Q8_0 vb.) ve parametre boyutu (7B, 14B vb.) bilgilerini çıkaran akıllı dedektör devreye alındı.
- **Compatibility Scoring:** Donanım (RAM/VRAM) ve çalışma zamanı (runtime) uyumluluğunu ölçen 0-1 arası skorlama sistemi eklendi.
- **Update Watcher:** Takip edilen modellerdeki güncellemeleri kontrol eden ve kullanıcıya bildiren altyapı kuruldu.
- **Install Plan Preview:** Model indirme/güncelleme öncesinde disk alanı ve risk analizi yapan "plan preview" akışı eklendi.

Model Discovery testi için:
```bash
npm run smoke:model-discovery-runtime
```
