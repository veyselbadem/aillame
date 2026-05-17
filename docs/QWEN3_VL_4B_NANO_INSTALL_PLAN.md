# Qwen3-VL 4B Nano Install Plan

Bu doküman, Aillame Nano çekirdeği (`nano.multimodal.core`) olarak seçilen **Qwen3-VL 4B** modelinin kurulum, uyumluluk ve aktivasyon planını içerir.

## 1. Neden Qwen3-VL 4B?

- **Multimodal Çekirdek**: Görsel analiz, OCR ve metin anlama yeteneklerini tek bir 4B modelde toplar.
- **Performans**: RTX 5060 (8GB VRAM) donanımında yüksek hızda (GPU hızlandırmalı) çalışabilir.
- **Entegrasyon**: `llama.cpp` ve `node-llama-cpp` tarafından desteklenen `qwen2vl/qwen3vl` mimarisini kullanır.
- **Lisans**: Apache 2.0 (Ticari ve kişisel kullanıma uygun).

## 2. Gerekli Dosyalar

Qwen3-VL bir multimodal model olduğu için **iki ana dosya** gerektirir:

1.  **Ana Model**: `qwen3-vl-4b-instruct-q4_k_m.gguf` (~2.8 GB)
2.  **Vision Projector**: `mmproj-qwen3-vl-4b-f16.gguf` (~600 MB)

**Dosya Yolu Standardı:**
`C:\Aillame\Models\nano\qwen3-vl-4b\`

## 3. Donanım Uygunluğu (RTX 5060 8GB VRAM)

| Kaynak | Beklenen Kullanım | Durum |
| :--- | :--- | :--- |
| **VRAM (Inference)** | ~3.5 GB - 4.5 GB | **Uygun** |
| **RAM (System)** | ~6 GB (Peak) | **Uygun** |
| **Disk Alanı** | ~4 GB | **Uygun** |
| **GPU Hızlandırma** | Full (CUDA) | **Destekleniyor** |

## 4. Runtime Entegrasyon Planı

Aillame mevcut GGUF runtime'ı multimodal desteği için şu güncellemeleri alacaktır:

- **Model Registry**: `mmprojPath` alanı eklenecek.
- **Runtime Service**: `node-llama-cpp` yüklenirken `mmprojPath` parametresi modele geçilecek.
- **Input Pipeline**: Kullanıcıdan gelen görsel ekleri (attachments) base64 formatında modele iletilecek.

## 5. Aktivasyon ve Capability Map

Model kurulduğunda aşağıdaki slotlar otomatik olarak bu modele yönlendirilecektir:

- **`nano.multimodal.core`**: Primary
- **`vision.review`**: Shared (Nano Core üzerinden)
- **`document.ocr`**: Shared (Nano Core üzerinden)
- **`task.routing`**: Internal Agent Logic

## 6. Riskler ve Fallback

- **Risk**: `node-llama-cpp` versiyonunun Qwen3-VL mimarisini tam desteklememesi.
  - **Çözüm**: Kütüphaneyi `latest` versiyona güncellemek.
- **Risk**: VRAM'in yetmemesi (Aynı anda Flux çalışırken).
  - **Çözüm**: Image generation sırasında Nano'yu CPU'ya kaydırmak veya sırayla çalıştırmak.
- **Fallback**: `Qwen2.5-VL 3B`. Eğer Qwen3 uyumluluk sorunu çıkarırsa, daha olgun olan 2.5 serisi kullanılacaktır.

## 7. FAZ L - Metadata ve Altyapı Güncellemesi

Aillame v1.3.0-minimal-strong ile aşağıdaki altyapı özellikleri eklenmiştir:

- **`modality`**: Modeller artık `text`, `vision_language` veya `image_generation` olarak sınıflandırılır.
- **`mmprojPath`**: VLM modelleri için gerekli olan vision projector dosya yolu registry'ye eklenmiştir.
- **`multimodalReady`**: GGUF + mmproj dosyalarının ikisi de mevcut ve uyumluysa bu değer `true` döner.
- **`MMPROJ_MISSING`**: mmproj dosyası olmadan VLM başlatılmaya çalışıldığında sistem güvenli bir hata döner.

## 9. FAZ N - Model Dosyası Edinme Planı

Qwen3-VL 4B modelinin doğru çalışması için doğrulanmış kaynaklar ve yerleşim adımları aşağıdadır.

### 9.1. Doğrulanmış Kaynaklar
- **Repo**: [unsloth/Qwen3-VL-4B-Instruct-GGUF](https://huggingface.co/unsloth/Qwen3-VL-4B-Instruct-GGUF)
- **Ana Model**: `Qwen3-VL-4B-Instruct-Q4_K_M.gguf` (~2.8 GB)
- **Vision Projector**: `mmproj-model-f16.gguf` (~600 MB)
- **Lisans**: Apache 2.0

### 9.2. Dosya Yerleşim Yapısı
`C:\Aillame\Models\nano\qwen3-vl-4b\`
- `model.gguf` (Qwen3-VL-4B-Instruct-Q4_K_M.gguf'tan rename edilecek)
- `mmproj.gguf` (mmproj-model-f16.gguf'tan rename edilecek)
- `README.txt` (Kaynak ve tarih bilgisi için)

### 9.3. Manuel Kurulum Komutları (PowerShell)
Kullanıcının yönetici modunda çalıştırması önerilen komutlar:

```powershell
# 1. Dizin Oluşturma
New-Item -ItemType Directory -Force -Path "C:\Aillame\Models\nano\qwen3-vl-4b"

# 2. Hugging Face'den İndirme (curl veya Invoke-WebRequest)
# Not: Hf-transfer veya tarayıcı ile manuel indirme daha hızlı olabilir.
# Ana Model
curl.exe -L "https://huggingface.co/unsloth/Qwen3-VL-4B-Instruct-GGUF/resolve/main/Qwen3-VL-4B-Instruct-Q4_K_M.gguf" -o "C:\Aillame\Models\nano\qwen3-vl-4b\model.gguf"

# Vision Projector
curl.exe -L "https://huggingface.co/unsloth/Qwen3-VL-4B-Instruct-GGUF/resolve/main/mmproj-model-f16.gguf" -o "C:\Aillame\Models\nano\qwen3-vl-4b\mmproj.gguf"
```

### 9.4. Aktivasyon Öncesi Testler
Dosyalar yerleştikten sonra:
1. `npx tsx scripts/test-vlm-metadata.ts` ile dosya varlığını doğrula.
2. `npx tsx scripts/test-model-slot-activation.ts` ile donanım uyumunu kontrol et.
3. Health endpoint üzerinden `vlm.multimodalReady: true` göründüğünden emin ol.

---
**Son Güncelleme**: 2026-05-16
**Durum**: FAZ Q Completed (Real Visual Inference Active)

---

## 10. FAZ P - Qwen3-VL 4B Explicit Activation Sonuçları

Aktivasyon 16 Mayıs 2026 tarihinde başarıyla tamamlanmıştır.

- **Slot**: `nano.multimodal.core` (Primary)
- **Status**: `registered` / `installed`
- **Multimodal Ready**: `true` (GGUF + mmproj verified)
- **Selectable**: `true`

---

## 11. FAZ Q - Real Visual Inference Pipeline Sonuçları

Gerçek multimodal inference hattı 16 Mayıs 2026 tarihinde başarıyla kurulmuştur.

### 11.1. VLM Inference Adapter (`src/core/nano/vision/vlm-inference-adapter.ts`)
- **Normalize Image**: Local path, Base64 (data URI veya raw) ve Buffer desteklenmektedir.
- **Supported Formats**: PNG, JPG/JPEG, WEBP.
- **Timeout**: 120,000ms (AILLAME_RUNTIME_TIMEOUT_MS).
- **GPU Acceleration**: `AILLAME_GPU_LAYERS=50` ile RTX 5060 üzerinde ~5s latency ile çalışmaktadır.

### 11.2. Step Executor Entegrasyonu
`vision.review` ve `document.ocr` görevleri artık gerçek VLM inference motorunu kullanmaktadır:
- **image_review**: Gelen görsel ve kullanıcı mesajı VLM'e iletilir.
- **document.ocr**: Qwen3-VL'e metin çıkarma ve özetleme promptu iletilir.
- **Hata Yönetimi**: Görsel eksikliği durumunda `IMAGE_ATTACHMENT_MISSING` kodu ile `degraded` moduna geçer, crash oluşmaz.

### 11.3. Güvenlik ve Gizlilik
- **No Path Leak**: Hata mesajları ve response metadatası yerel dosya yollarını sızdırmaz.
- **No Raw Buffer**: Response içinde raw buffer veya büyük base64 verileri tutulmaz.
- **Error Normalization**: Tüm VLM hataları standart `errorCode` formatına çevrilir.

### 11.4. Test Sonuçları
- **Image Review (1x1 PNG)**: Success (Latency: 5.4s)
- **OCR (Base64)**: Success (Latency: 3.1s)
- **Regression**: Tüm Nano orchestration testleri (Planner, Executor, Feedback) ve Text MVP testleri başarılıdır.

### 11.5. Kalan Limitler / Sonraki Adımlar
- **Multi-Image Support**: Şu an tek görsel destekleniyor.
- **Advanced OCR**: Tablo ve kompleks layout analizi için özelleşmiş promptlar eklenebilir.
- **Asset Store Integration**: Gerçek bir Asset Store servisi ile ID tabanlı görsel çözümleme eklenecektir.
