# Aillame Local AI Hub

Aillame, farklı projelerin yerel AI ihtiyaçlarını tek merkezden yöneten bağımsız bir **Local AI Hub** ürünüdür. Hedef mimari; yerel LLM runtime, yerel IGM/diffusion worker, model discovery, provider API, project memory, RAG document library, approval-gated Code Agent, Nano evaluation/advisory çekirdeği ve desktop readiness katmanlarını tek çatı altında toplar.

Aillame bir Ollama, ComfyUI veya LM Studio wrapper'ı değildir. Bu araçlar zorunlu bağımlılık değildir; varsa yalnızca compatibility, migration veya deneysel kıyaslama bağlamında ele alınır. Final kabul için gerçek üretim yapan en az bir yerel LLM ve en az bir yerel IGM, Aillame-controlled runtime/worker üzerinden yönetilmelidir.

## Ürün Hedefi

**Beta Foundation RC**, altyapı katmanlarının hazır olduğunu gösterir.  
**Live Runtime Acceptance**, gerçek yerel LLM metin üretimi ve gerçek yerel IGM görsel üretimi çalıştığında sağlanır.

Final/beta kabul kriterleri:

1. En az 1 yerel LLM gerçek metin üretmeli.
2. En az 1 yerel IGM gerçek görsel üretmeli.
3. LLM ve IGM Aillame-controlled runtime/worker üzerinden yönetilmeli.
4. Ollama ve ComfyUI zorunlu bağımlılık olmamalı.
5. Foundation, preview, degraded veya not-configured durumu tek başına final kabul için yeterli değildir.

## Ana Katmanlar

- **LLM Runtime / GGUF Text Runtime:** Yerel metin modeli çalıştırma, model discovery, readiness ve runtime acceptance.
- **IGM Runtime / Diffusion Worker:** Görsel üretim job queue, asset manager, workflow contract ve runtime acceptance.
- **External Provider API:** OpenAI-compatible `/api/v1/chat/completions` ve project-aware external provider endpointleri.
- **Project Memory:** Global, project ve session scope ayrımıyla izole hafıza.
- **RAG Document Library:** Güvenli ingestion, chunking, vector binding ve memory attribution.
- **Code Agent:** Plan, patch proposal, approval-gated apply ve verifier allowlist. Otomatik destructive işlem yoktur.
- **Nano Intelligence:** Ana chat modeli değil; decision, evaluation, safety, feedback ve advisory çekirdeğidir. `autonomousActionsEnabled` kapalı kalır.
- **Security:** API key, permission, audit log, rate limit ve production guard foundation.
- **Desktop Readiness:** Local server boot, health bridge ve packaging hazırlığı.

## UI Rol Ayrımı

Aillame Lab, deney/evaluation/playground alanıdır. Ana operasyon ekranları runtime, memory, agent, provider, security ve release başlıkları altında ayrılır; Lab bu alanların yerine geçmez.

## CLI

CLI güvenli ve sınırlı bir ürünleşme yüzeyidir:

```bash
npm run cli:aillame -- status
npm run cli:aillame -- health
npm run cli:aillame -- projects
npm run cli:aillame -- diagnostics
```

CLI destructive işlem yapmaz, dependency yüklemez, dosya yazmaz ve otomatik komut çalıştırmaz.

## Doğrulama Komutları

Temel doğrulama:

```bash
npm run typecheck
npm run build
npm run qa:beta
npm run smoke:beta-rc
npm run smoke:desktop-readiness
npm run smoke:live-text-runtime
npm run smoke:live-image-runtime
```

Ek kritik smoke testleri:

```bash
npm run smoke:provider-e2e
npm run smoke:code-agent-patch-workflow
npm run smoke:model-discovery-runtime
npm run smoke:rag-document-library
npm run smoke:image-runtime-assets
npm run smoke:nano-eval-training
```

## Security ve Production Notları

- Production ortamında external provider auth ve permission kontrolleri açık olmalıdır.
- API key değerleri plaintext olarak UI veya log çıktısında gösterilmez.
- Audit log kayıtları sanitize edilir; `.env`, token, key ve secret içerikleri loglanmaz.
- Code Agent file write, patch apply ve verifier akışları approval/audit guard arkasında kalır.
- Model indirme ve runtime execution akışları açık kullanıcı onayı ve path policy olmadan otomatik çalıştırılmaz.

## Konfigürasyon

Güncel config yüzeyi için `.env.example` dosyasındaki `AILLAME_*` değişkenlerini kullanın. Ana mimari isimleri generic tutulur:

- `AILLAME_GGUF_RUNTIME_ENABLED`
- `AILLAME_GGUF_RUNTIME_BINARY`
- `AILLAME_GGUF_MODEL_DIR`
- `AILLAME_GGUF_ACTIVE_MODEL`
- `AILLAME_IGM_RUNTIME_ENABLED`
- `AILLAME_IGM_MODEL_DIR`
- `AILLAME_MODEL_DISCOVERY_ENABLED`
- `AILLAME_RUNTIME_ACCEPTANCE_REQUIRED`

Gemma, Qwen, SDXL, Gemini veya Ollama gibi model/araç özel isimleri yalnızca örnek, compatibility veya deneysel profil olarak kabul edilir; ana ürün mimarisi bunlara bağlı değildir.

## Bilinen Sınırlar

- Live LLM runtime configured değilse sistem Beta Foundation seviyesinde kalır.
- Live IGM runtime configured değilse görsel üretim final kabulü sağlanmaz.
- PDF/DOCX ingestion desteği sınırlı olabilir; text/markdown/json/code akışları önceliklidir.
- Embedding/vector store katmanlarında bazı ortamlar placeholder veya file-store stratejisiyle çalışabilir.
- AI Lab ana ürün merkezi değildir; deney, evaluation ve playground alanıdır.

## Dokümanlar

- [Beta Foundation RC](docs/releases/beta-foundation-rc.md)
- [Runtime Acceptance](docs/runtime-acceptance.md)
- [Live Runtime Setup](docs/live-runtime-setup.md)
- [Desktop Readiness](docs/desktop-readiness.md)
- [Persistent Memory Strategy](docs/persistent-memory-strategy.md)
- [RAG Document Library](docs/rag-document-library.md)
- [Security Hardening](docs/security-hardening.md)
- [Code Agent Patch Workflow](docs/code-agent-patch-workflow.md)
