# Aillame Usage Notes

Bu doküman eski MVP notlarının temizlenmiş sürümüdür. Güncel ürün hedefi:

**Aillame = Bağımsız Local AI Hub**

Aillame, tek bir model ailesi veya dış runtime aracı etrafında tasarlanmaz. Ana ürün dili generic kalır:

- LLM runtime
- GGUF text runtime
- IGM runtime
- diffusion worker
- model discovery
- provider API
- project memory
- RAG document library
- Code Agent approval workflow
- Nano advisory/eval

## Workspace Kullanımı

- Ana sohbet ekranı project-aware chat ve runtime routing için kullanılır.
- Library ekranı RAG/document ingestion yüzeyidir.
- Memory ekranı global/project/session scope ayrımını gösterir.
- Generate ekranı IGM workflow ve image job queue hazırlığını gösterir.

## Admin Kullanımı

- Dashboard, health ve beta readiness durumunu özetler.
- Runtime & Modeller, model discovery ve runtime readiness için kullanılır.
- Provider API, external provider ve OpenAI-compatible yüzeylerini gösterir.
- Code Agent, plan-only / approval-gated workflow için kullanılır.
- Aillame Lab, ana ürün merkezi değil; experiment/evaluation/playground alanıdır.
- Intelligence/Nano ekranları Nano'nun advisory/eval rolünü ve training candidate durumunu gösterir.

## Compatibility Notu

Eski dokümanlarda Gemma, Qwen, SDXL, Gemini veya Ollama gibi isimler ana akış gibi görünebilir. Güncel yorum:

- Bunlar zorunlu dependency değildir.
- Bunlar yalnızca örnek model, compatibility adapter veya Lab katılımcısı olabilir.
- Final kabul için gerçek üretim yapan LLM ve IGM, Aillame-controlled runtime/worker üzerinden yönetilmelidir.

## Final Kabul

`foundation`, `preview`, `degraded`, `planning_only` veya `not-configured` durumları ürün finali için yeterli değildir. Kabul için:

```bash
npm run smoke:live-text-runtime
npm run smoke:live-image-runtime
```

komutları gerçek local runtime konfigürasyonu ile başarılı olmalıdır.
