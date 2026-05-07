# Aillame Runtime Acceptance

Aillame icin **Beta Foundation RC** ve **Live Runtime Acceptance** ayni sey
degildir.

- Beta Foundation RC: runtime, provider, memory, agent, security, desktop ve UI
  altyapi katmanlarinin calistigini gosterir.
- Live Runtime Acceptance: en az bir gercek yerel LLM metin uretimi ve en az
  bir gercek yerel IGM gorsel uretimi Aillame-controlled runtime/worker
  uzerinden basariyla tamamlandiginda saglanir.

Foundation, preview, degraded, not-configured, placeholder veya fallback cikti
tek basina final kabul sayilmaz.

## Final Kabul Kriterleri

1. En az bir yerel LLM gercek metin uretmeli.
2. En az bir yerel IGM gercek gorsel uretmeli.
3. LLM ve IGM Aillame-controlled runtime/worker uzerinden yonetilmeli.
4. Ollama, ComfyUI ve LM Studio zorunlu bagimlilik olmamali.
5. Nano advisory/eval/decision cekirdegi ana LLM final kabul yerine gecmemeli.

## LLM Acceptance

Bir LLM icin `finalAcceptanceReady=true` olmasi icin:

- `AILLAME_GGUF_RUNTIME_ENABLED=true`
- `AILLAME_GGUF_RUNTIME_BINARY` yerel Aillame-controlled text worker binary
  yolunu gostermeli.
- `AILLAME_GGUF_MODEL_PATH` veya `AILLAME_GGUF_MODEL_DIR` +
  `AILLAME_GGUF_ACTIVE_MODEL` yerel GGUF model dosyasini gostermeli.
- Model dosyasi mevcut olmali.
- Runtime binary mevcut ve executable gorunmeli.
- Binary adi Ollama, LM Studio, Gemini veya OpenAI gibi dis/cloud wrapper
  izlenimi vermemeli.
- Worker gercek generation denemesi yapmali.
- Response bos olmamali.
- Cikti fallback, degraded veya placeholder olmamali.

Nano probe bilgisi acceptance raporunda gorunebilir, fakat Nano tek basina ana
LLM final kabul sayilmaz.

Varsayilan smoke argumanlari llama.cpp/CLI benzeri runtime'lar icin
`-m {model} -p {prompt} -n {maxTokens} --temp {temperature}` seklindedir.
Farkli bir Aillame-controlled worker arguman sozlesmesi kullaniliyorsa
`AILLAME_GGUF_RUNTIME_ARGS` ile sablon verilebilir.

## IGM Acceptance

Bir IGM icin `finalAcceptanceReady=true` olmasi icin:

- `AILLAME_IGM_RUNTIME_ENABLED=true`
- `AILLAME_IGM_MODEL_DIR` yerel diffusion model dizinini gostermeli.
- `AILLAME_IGM_ACTIVE_MODEL` bu dizindeki model dosyasini gostermeli.
- `AILLAME_IGM_OUTPUT_DIR` yazilabilir olmali.
- Aillame-controlled IGM worker gercek image job calistirmali.
- Job `completed` olmali.
- PNG veya JPEG gibi gercek bir image asset dosyasi olusmali.
- Placeholder/dummy dosya final kabul sayilmamali.

## Acceptance Report Alanlari

Runtime acceptance raporu su ayrimi acik tutar:

- `configured`: gerekli config ve dosyalar gorunuyor mu?
- `attempted`: gercek generation denemesi yapildi mi?
- `succeeded`: gercek generation basarili oldu mu?
- `finalAcceptanceReady`: final kabul icin tum kosullar saglandi mi?
- `missingConfig`: eksik environment/config alanlari.
- `missingFiles`: eksik model veya output path bilgileri.
- `missingWorker`: Aillame-controlled worker eksikleri.
- `nextActions`: kullanicinin bir sonraki somut adimlari.

## Smoke Komutlari

```bash
npm run smoke:live-text-runtime
npm run smoke:live-image-runtime
npm run smoke:live-runtime-acceptance
npm run smoke:desktop-readiness
```

Runtime yoksa bu komutlar rapor uretir ve QA zincirini kirmadan
`finalAcceptanceReady=false` doner. Bu davranis bilinclidir: eksik runtime
gizlenmez, fakat foundation testleri de sahte basari uretmez.

## Git ve Guvenlik

- Model, checkpoint, diffusion agirligi ve uretilen asset dosyalari git'e
  eklenmemelidir.
- `.aillame-data`, `.aillame-test-data`, `.next`, `node_modules`, `dist`,
  `build`, `coverage` ve cache ciktilari stage edilmemelidir.
- `.env`, token, key ve secret icerikleri loglanmamalidir.
- Model indirme, dis network veya dependency install bu acceptance raporunun
  parcasi degildir.
