# Aillame Lab: Evaluation Playground

Aillame Lab, ana ürün merkezi değildir. Bu alan model, prompt, Nano kararları ve runtime davranışlarını kontrollü biçimde denemek için kullanılan bir **evaluation/playground** yüzeyidir.

Ana ürün hedefi şudur:

- Aillame = bağımsız Local AI Hub.
- LLM runtime ve IGM runtime Aillame-controlled worker katmanlarıyla yönetilir.
- Nano ana chat modeli değil; decision, eval, safety ve advisory çekirdeğidir.
- AI Lab çıktıları doğrudan eğitime veya production kararına gitmez.

## Rol Ayrımı

| Alan | Güncel rol |
| --- | --- |
| Runtime | Yerel LLM/IGM worker readiness ve execution acceptance |
| Provider API | Harici projelerin Aillame'e bağlanma yüzeyi |
| Project Memory / RAG | Project-isolated bilgi ve belge hafızası |
| Code Agent | Approval-gated plan, patch proposal ve verifier akışı |
| Nano | Advisory/eval/decision çekirdeği |
| Aillame Lab | Deney, karşılaştırma, kalite testi ve playground |

## Compatibility Katılımcıları

Lab oturumlarında Gemma, Qwen, SDXL, Gemini veya Ollama gibi isimler görülebilir. Bunlar ana mimari adı değildir:

- Gemma/Qwen: örnek veya compatibility LLM profili.
- SDXL: örnek veya compatibility IGM profili.
- Gemini: external provider deneyi.
- Ollama: optional compatibility fallback, zorunlu dependency değil.

Yeni doküman ve ürün dili için generic adlar kullanılmalıdır:

- LLM runtime
- GGUF text runtime
- IGM runtime
- diffusion worker
- model discovery
- runtime acceptance

## Learning ve Feedback Sınırı

AI Lab çıktıları doğrudan Nano eğitim setine alınmaz. Güvenli akış:

1. Lab çıktısı candidate olarak işaretlenir.
2. Sensitive content ve kalite validator çalışır.
3. Admin review gerekir.
4. Yalnızca approved candidate export edilebilir.

Nano için `autonomousActionsEnabled` her durumda false kalır. Nano dosya yazma, komut çalıştırma, network çağrısı veya self-training başlatma yetkisi almaz.

## Runtime Acceptance Ayrımı

Beta Foundation RC, Lab deneylerinin ve altyapı sözleşmelerinin hazır olduğunu gösterir. Final kabul için ayrıca:

1. En az bir yerel LLM gerçek metin üretmelidir.
2. En az bir yerel IGM gerçek görsel üretmelidir.
3. İkisi de Aillame-controlled runtime/worker üzerinden yönetilmelidir.

`planning_only`, `degraded`, `not-configured` veya `preview` durumları final kabul sayılmaz.
