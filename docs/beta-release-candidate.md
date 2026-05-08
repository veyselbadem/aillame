# Aillame Beta Release Candidate

## Aillame nedir?

Aillame, yerel LLM, yerel IGM, provider API, güvenli Kod Asistanı, bellek ve ürün sağlığı tanılamalarını tek yerel ürün çatısı altında toplayan bir masaüstü/web yönetim ortamıdır. Beta RC kapsamı geliştirme deneyimini ürünleşmiş, doğrulanabilir ve güvenlik sınırları belirgin bir beta paketine dönüştürür.

## Beta RC kapsamı

- Yerel metin üretimi için GGUF tabanlı runtime kabul testi.
- Yerel görsel üretimi için IGM worker kabul testi.
- Provider API ile dış projelere kontrollü metin ve görsel üretim yüzeyi.
- Kod Asistanı için beta-lock: tarama, plan, deep context, patch proposal, dry run, onaylı apply ve execution audit.
- Memory / Learning Cards ile güvenli öğrenme özetleri.
- Product Health ile birleşik runtime, provider, agent, memory ve artifact hygiene durumu.

## Yerel LLM durumu

LLM kabul kriteri gerçek, boş olmayan, fallback olmayan bir yanıt üretimidir. `smoke:live-runtime-acceptance` metin runtime yapılandırmasını, model seçimini ve üretim sonucunu doğrular. Model yolu raporlarda maskeleme ve dosya adı seviyesinde tutulur.

## Yerel IGM durumu

IGM kabul kriteri gerçek PNG çıktısı, placeholder kullanılmaması ve worker/model yapılandırmasının tamamlanmasıdır. Ağır üretim sadece live runtime acceptance içinde yapılır; final RC smoke statik audit ile sınırlıdır.

## CPU fallback açıklaması

CPU fallback desteklenir, ancak performans uyarısı sayılır. Product Health `cpuFallback` alanını `Ready` veya `Performance Warning` olarak raporlar; gerçek path veya secret göstermez.

## Provider API durumu

Provider API `/api/provider/v1/status`, `/api/provider/v1/models` ve `/api/provider/v1/generate` rotalarıyla beta kullanımına hazırdır. Her çağrı dış client doğrulamasından geçer ve örneklerde yalnızca `YOUR_AILLAME_API_KEY` kullanılır.

## Kod Asistanı / Agent durumu

Agent beta-lock korunur. Agent terminal komutu çalıştırmaz, testleri otomatik başlatmaz ve onaysız yazmaz. Yazma akışı dry run, explicit approval, backup ve execution audit sınırlarıyla çalışır.

## Memory / Learning Cards durumu

Memory sistemi güvenli özet, risk seviyesi, değişen alanlar ve doğrulama önerilerini saklar. Secret ve lokal path redaction uygulanır. Runtime memory data git dışında kalır.

## Product Health durumu

Product Health birleşik raporda LLM, IGM, Provider API, Agent, Memory, Storage ve Release Candidate durumunu verir. RC görünümü `Beta RC Ready`, `Degraded` veya `Blocked` sonucunu üretir.

## Bilinen sınırlamalar

- Beta RC yerel kurulum varsayar; cloud fallback yoktur.
- Ollama, Gemini, OpenAI-compatible, mock, hybrid ve benzeri legacy/experimental yüzeyler ana Beta RC yolu değildir; varsa yalnızca uyumluluk, migrasyon veya değerlendirme bağlamında yorumlanır.
- Agent doğrulama komutlarını önerir ama otomatik çalıştırmaz.
- Provider API canlı üretim için yerel runtime readiness durumuna bağlıdır.
- CPU fallback kullanılabilir, ancak üretim hızı donanıma göre sınırlıdır.

## Güvenlik ilkeleri

- Secret, token ve gerçek API key dokümanlara yazılmaz.
- `.env`, virtualenv, model dosyaları, generated assetler, runtime data ve agent memory data git dışında kalır.
- Agent endpointleri terminal execution yüzeyi açmaz.
- Onaylı apply öncesinde dry run ve açık kullanıcı onayı gerekir.

## Final test checklist

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run smoke:live-runtime-acceptance`
- `npm.cmd run smoke:provider-api`
- `npm.cmd run smoke:agent-beta-lock`
- `npm.cmd run smoke:agent-memory`
- `npm.cmd run smoke:product-health`
- `npm.cmd run smoke:phase6-hardening`
- `npm.cmd run smoke:final-rc`

## Release Candidate sonucu

Bu doküman ve final RC smoke paketi başarılı olduğunda Aillame Beta RC sonucu `READY` kabul edilir. Başarısız zorunlu test veya takip edilen hassas artefakt varsa sonuç `NOT READY` olur.
