# Aillame Stable Baseline (Phase 2.3)

Bu doküman, Aillame projesinin Phase 2.3 (Donanım Optimizasyonu ve Registry Temizliği) sonrasındaki stabil durumunu ve çalışma standartlarını tanımlar.

## 1. Sistem Özeti
Aillame, yerel GGUF runtime (`node-llama-cpp`) üzerinden NVIDIA GPU hızlandırmalı metin üretimi ve worker tabanlı görsel üretimi yapabilen, production-ready bir Text MVP seviyesine ulaşmıştır.

## 2. Çalışma Komutları

### Backend (Compiled API)
```bash
# Backend'i derle
npm run api:build

# API Sunucusunu başlat (Production)
node dist/server.js
```

### Frontend
```bash
# Geliştirme modu
npm run dev

# Production Build
npm run build
npm run start
```

## 3. Model Rolleri ve Durumu

| Model ID | Rol | Durum | Not |
| :--- | :--- | :--- | :--- |
| `qwen2-5-0-5b-instruct-q4-k-m` | **Legacy Test / Fallback** | `registered` | Smoke test ve düşük kaynaklı fallback modeli. |
| `gemma-4-26b-it-q4-k-m` | **Archived / Unsupported** | `archived` | Mimari uyuşmazlığı nedeniyle pasifize edildi. |

## 4. Donanım ve Performans (HP OMEN RTX 5060)
- **GPU Hızlandırma**: Aktif (`AILLAME_USE_GPU=true`).
- **GPU Katmanları**: `AILLAME_GPU_LAYERS=32` (Tam offloading).
- **VRAM Kullanımı**: Qwen 0.5B ile ~500MB (Çok verimli).
- **Performans**: ~100-180 token/s.

## 5. Kabul Kriterleri (Baseline Criteria)
- `npm run typecheck` her zaman temiz olmalıdır.
- `GET /api/aillame/health` `status: ok` ve `hardwareGpu: cuda` dönmelidir.
- `POST /api/aillame/chat` Qwen 0.5B ile gerçek cevap üretmelidir.
- Gemma 4 26B seçildiğinde sistem çökmemeli, `UNSUPPORTED_ARCHITECTURE` dönmelidir.
- GPU yoksa sistem otomatik olarak CPU moduna düşmeli (Fallback) ve servis kesilmemelidir.

## 6. Kritik Dosyalar ve Korunması Gerekenler
- `.env`: GPU ve Path ayarları burada saklanır.
- `src/services/runtime/llama-instance.ts`: Tekil Llama instance yönetimi.
- `src/services/model-registry.service.ts`: Model seçim mantığı.
- `~/.aillame/registry/installed-models.json`: Gerçek dünya model kayıtları.

---
**Son Güncelleme**: 2026-05-16
**Versiyon**: 1.3.0-stable
