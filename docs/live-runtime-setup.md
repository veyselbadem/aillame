# Live Runtime Setup

Bu not, Aillame'i Beta Foundation RC seviyesinden Live Runtime Acceptance
seviyesine tasimak icin gereken yerel LLM ve IGM kosullarini ozetler.

## 1. Yerel LLM / GGUF Text Runtime

Gerekenler:

- Aillame-controlled text worker binary.
- Yerel GGUF model dosyasi.
- Worker'in prompt alip gercek metin uretmesi.
- Fallback, Nano advisory veya placeholder olmayan bos olmayan response.

Ornek config sekli:

```bash
AILLAME_GGUF_RUNTIME_ENABLED=true
AILLAME_GGUF_RUNTIME_BINARY=C:\AillameRuntimes\text-worker\aillame-gguf-worker.exe
AILLAME_GGUF_MODEL_DIR=C:\AillameModels\gguf
AILLAME_GGUF_ACTIVE_MODEL=local-model.gguf
AILLAME_LIVE_TEXT_RUNTIME_REQUIRED=true
```

Alternatif olarak tek dosya yolu:

```bash
AILLAME_GGUF_MODEL_PATH=C:\AillameModels\gguf\local-model.gguf
```

Acceptance komutu:

```bash
npm run smoke:live-text-runtime
```

Success icin beklenen ozet:

- `configured=true`
- `attempted=true`
- `succeeded=true`
- `fallbackUsed=false`
- `degraded=false`
- `finalAcceptanceReady=true`

## 2. Yerel IGM / Diffusion Worker

Gerekenler:

- Aillame-controlled IGM worker.
- Yerel diffusion model dizini.
- Aktif model dosyasi.
- Yazilabilir output dizini.
- Gercek PNG/JPEG asset uretilen completed image job.

Ornek config sekli:

```bash
AILLAME_IGM_RUNTIME_ENABLED=true
AILLAME_IGM_MODEL_DIR=C:\AillameModels\diffusion
AILLAME_IGM_ACTIVE_MODEL=local-image-model.safetensors
AILLAME_IGM_OUTPUT_DIR=C:\AillameData\assets\images
AILLAME_IGM_DEVICE=auto
AILLAME_LIVE_IMAGE_RUNTIME_REQUIRED=true
```

Acceptance komutu:

```bash
npm run smoke:live-image-runtime
```

Success icin beklenen ozet:

- `configured=true`
- `attempted=true`
- `succeeded=true`
- `fileExists=true`
- `placeholderUsed=false`
- `finalAcceptanceReady=true`

## 3. Birlesik Kontrol

```bash
npm run smoke:live-runtime-acceptance
```

`overallFinalAcceptanceReady=true` sadece hem LLM hem IGM acceptance true ise
doner.

## 4. Bilerek Yapilmayanlar

- Ollama entegrasyonu zorunlu kabul edilmez.
- ComfyUI entegrasyonu zorunlu kabul edilmez.
- LM Studio entegrasyonu zorunlu kabul edilmez.
- Model indirme veya dis network komutu bu rehberin parcasi degildir.
- Placeholder PNG veya dummy text acceptance olarak sayilmaz.

## 5. Git'e Eklenmeyecekler

- GGUF, safetensors, ckpt, bin, onnx gibi model agirliklari.
- Uretilen image asset dosyalari.
- `.aillame-data`, `.aillame-test-data`, `.next`, `node_modules`, `dist`,
  `build`, `coverage` ve cache ciktilari.
- `.env`, key, token ve secret degerleri.
