# Aillame Model Slot Installation and Activation (Minimal Strong Strategy)

Aillame, yetenek tabanlı (capability-based) bir mimari kullanır. Model Slotları, bu yeteneklerin (metin üretimi, kod yazımı, görsel analizi vb.) donanım üzerindeki fiziksel karşılıklarını (LLM/GGUF dosyaları) tanımlar.

## 1. Minimal Model Yapısı

Aillame v1, karmaşıklığı azaltmak için 4 ana model slotu etrafında optimize edilmiştir:
- **`nano.multimodal.core`**: Çok amaçlı (Vision/OCR/Reasoning) çekirdek model.
- **`text.general`**: Ana dil modeli (Sohbet, kod, analiz).
- **`image.generate`**: Görsel üretim uzmanı.
- **`memory.embedding`**: Hafıza ve RAG uzmanı.

## 2. Model Kurulum ve Aktivasyon Süreci

### Adım 1: Kayıt (Registration)
Model dosyası (.gguf) kütüphaneye eklenir. `InstalledModelRegistryService` üzerinden kayıt işlemi yapılır.

### Adım 2: Doğrulama (Validation)
`ModelSlotActivationService` donanım (RTX 5060 8GB / 24GB RAM) uyumluluğunu kontrol eder.

### Adım 3: Slot Aktivasyonu (Activation)
Model, ilgili yetenek slotuna (Primary veya Fallback) admin onayıyla bağlanır.

## 3. Donanım Uygunluk Tablosu (Sadeleştirilmiş)

| Model Sınıfı | Örnek | Uygunluk | Notlar |
| :--- | :--- | :--- | :--- |
| **Nano (2B-4B)** | `qwen3-vl-4b` | Mükemmel | Ana çekirdek için ideal. |
| **Large (7B-8B)** | `qwen3-8b` | İyi | GPU hızlandırmalı tam performans. |
| **Huge (14B-26B)** | `gemma-4` | Riskli | **Archived** olarak korunur, yavaş çalışır. |

## 4. Kritik Aktivasyon Kuralları

- **Az Model Prensibi**: Bir model (örn: Qwen3 8B) hem `text.general` hem de `code.generate` slotlarını aynı anda doldurabilir.
- **No Auto-Apply**: Yeni modeller asla kullanıcı onayı olmadan "Active" yapılmaz.
- **Baseline Protection**: `qwen2.5-0.5b` her zaman kütüphanede `legacy.test` olarak hazır bekler.

## 5. Vision-Language (VLM) Özel Gereksinimleri

Görsel yetenekli modeller (örn: Qwen3-VL) için sadece `.gguf` dosyası yeterli değildir. Bu modellerin çalışabilmesi için:
1.  **Ana Model**: LLM ağırlıklarını içeren `.gguf` dosyası.
2.  **Vision Projector**: Görselleri anlamlandıran `.mmproj.gguf` dosyası.

**Aktivasyon Kuralı**: Bir VLM modeli için `.mmproj.gguf` dosyası eksikse, `safeToActivate` değeri `false` döner ve modelin Nano Core olarak atanmasına izin verilmez.

---
**Son Güncelleme**: 2026-05-16
**Versiyon**: 1.3.0-minimal-strong
