# Aillame Release Checklist

Bu doküman, her sürüm adayı (Release Candidate) öncesinde çalıştırılması gereken adımları içerir.

---

## 1. Git Temizliği

```bash
git status --short
git diff --cached --name-status
```

Her iki komut da çıktı vermemeli (clean worktree, empty staged area).

---

## 2. Type Kontrolü ve Build

```bash
npm run lint     # tsc --noEmit — sıfır hata beklenir
npm run build    # next build --webpack — başarılı tamamlanmalı
```

Build çıktısında `/api/v1/chat/completions`, `/api/v1/models`, `/admin/model-library`,
`/api/admin/model-library/gemma-switch-preflight`, `/api/admin/ai-lab/runtime-events` sayfaları görünmeli.

---

## 3. External API Smoke Testi

```bash
# Local server çalışır olmalı:
npm run dev

# Ayrı terminalde:
AILLAME_EXTERNAL_API_KEY=your-key npm run smoke:external-api
```

Başarılı çıktı:
```
[smoke:external-api] models ok (N models)
[smoke:external-api] chat ok
[smoke:external-api] all checks passed
```

Sunucu kapalıysa "Local server is not reachable. Start the app first." mesajı alınır; bu build'i bozmaz.

Ortam değişkenleri:
- `AILLAME_EXTERNAL_API_BASE_URL` — default: `http://localhost:3000`
- `AILLAME_EXTERNAL_API_KEY` — test için API anahtarı

---

## 4. Model Artifact Kontrolü

```bash
git ls-files | grep -E "\.(gguf|safetensors|pth|pt|onnx|bin|ckpt)$"
```

PowerShell:
```powershell
git ls-files | Select-String -Pattern "\.(gguf|safetensors|pth|pt|onnx|bin|ckpt)$"
```

Çıktı boş olmalı. Model dosyası bulunursa commit'e alınmadan önce `.gitignore`'a eklenmeli.

---

## 5. Runtime Store Kontrolü

Aşağıdaki dosyalar git tarafından takip edilmemeli:

```bash
git ls-files data/model-library/preferences.json
git ls-files data/ai-lab/runtime-events.json
```

Her iki komut da çıktı vermemeli.

---

## 6. Admin Manuel Kontroller

1. `http://localhost:3000/admin/login` — Admin girişi çalışıyor mu?
2. `http://localhost:3000/admin/model-library` — Model Library sayfası yükleniyor mu?
3. Varsayılan model seçimi (text/code/vision...) çalışıyor mu?
4. Gemma switch preflight dry-run endpoint'i yanıt veriyor mu?

```bash
curl -X POST http://localhost:3000/api/admin/model-library/gemma-switch-preflight \
  -H "x-aillame-admin-token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"modelPath": "/test/model.gguf", "dryRun": true}'
```

---

## 7. API Manuel Kontroller

```bash
# Model listesi
curl http://localhost:3000/api/v1/models \
  -H "Authorization: Bearer your-api-key"

# Chat tamamlama
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"aillame-default","messages":[{"role":"user","content":"Merhaba"}]}'
```

---

## 8. Known Limitations (v0.1.0-rc1)

| Alan | Durum |
|---|---|
| Gemma switching | Yalnızca dry-run/preflight; gerçek model değişimi aktif değil |
| Model install/delete | Güvenli şekilde ertelenmiştir |
| Rate limit | In-memory, best-effort; restart'ta sıfırlanır; serverless'ta paylaşımsız |
| Model library migration | Şema değişimlerine karşı otomatik migration yoktur |
| Multi-instance deployment | Rate limit state paylaşılmaz |

---

## 9. Release Candidate Tag

Tüm kontroller geçtikten sonra tag oluştur:

```bash
# Sadece hazırsan çalıştır:
git tag -a v0.1.0-rc1 -m "Aillame v0.1.0 RC1"
git push origin v0.1.0-rc1
```

> **Not:** Bu komutu otomatik çalıştırma. Tüm manuel kontroller ve smoke testler geçtikten sonra elle çalıştır.

---

## 10. Sonraki Adımlar

- **FAZ 15A**: Gerçek Gemma model switching aktifleştirme (şu an dry-run)
- **FAZ 15B**: BOSS AI / Doomsgame Engine tarafında Aillame provider entegrasyonu
- **FAZ 15C**: Multi-instance rate limit için Redis veya shared store entegrasyonu
