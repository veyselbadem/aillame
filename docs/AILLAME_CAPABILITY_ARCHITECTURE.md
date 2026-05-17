# Aillame Capability Architecture (Minimal Strong Model Strategy v1)

Aillame, model tabanlı değil **capability (yetenek)** tabanlı bir AI mimarisine sahiptir. Bu mimari, LLM modellerinin hızlı değiştiği bir ekosistemde sistemin stabil kalmasını ve modellerin kolayca değiştirilmesini sağlar.

## 1. Temel Capability Listesi

Aillame çekirdeği aşağıdaki 10 temel yetenek üzerinden organize edilir:

1.  **nano.multimodal.core**: Hızlı, yerel ve görsel yetenekli ana çekirdek (UI etkileşimi, analiz).
2.  **text.general**: Genel sohbet ve karmaşık metin işleme.
3.  **code.generate**: Yazılım geliştirme ve analiz yetenekleri.
4.  **image.generate**: Görsel üretim (Diffusion).
5.  **vision.review**: Görüntü analizi ve güvenlik kontrolü.
6.  **memory.embedding**: Hafıza ve vektörleme yetenekleri.
7.  **safety.review**: Girdi ve çıktı güvenlik denetimi.
8.  **document.ocr**: Doküman tarama ve metin çıkarma.
9.  **audio.speech**: Sesli etkileşim (Gelecek).
10. **reranker.search**: Arama sonuçlarını optimize etme (Gelecek).

## 2. Minimal Strong Model Stratejisi

Aillame, "Az Model, Çok Güçlü Yetenek" prensibini izleyerek sistemi 4 ana model etrafında toplar:

| Capability Slot | Primary Model | Status | Notes |
| :--- | :--- | :--- | :--- |
| **nano.multimodal.core** | `qwen3-vl-4b` | Placeholder | Vision, OCR ve Routing yeteneklerini kapsar. |
| **text.general** | `qwen3-8b` | Placeholder | Genel sohbet ve temel kod yazımı için ana model. |
| **image.generate** | `flux.1-schnell` | Placeholder | Yüksek kaliteli görsel üretim. |
| **memory.embedding** | `bge-m3` | Placeholder | RAG ve Reranker görevlerini üstlenir. |
| **code.generate** | `qwen3-8b` | Shared | İleri seviye kod için `qwen3-coder` (Opsiyonel). |
| **vision.review** | `qwen3-vl-4b` | Shared | Nano Core tarafından paylaşılan yetenek. |
| **document.ocr** | `qwen3-vl-4b` | Shared | Nano Core tarafından paylaşılan yetenek. |
| **safety.review** | `rule-based` | Active | Nano Core yardımlı akıllı denetim. |
| **legacy.test** | `qwen2.5-0.5b` | **Active** | **Stable Baseline & Fallback.** |
| **archive.research** | `gemma-4-26b` | **Archived** | **Unsupported Research Baseline.** |

## 3. Model Hiyerarşisi ve Fallback

- **Strong Primary**: `qwen3` serisi ana iş gücünü oluşturur.
- **Stable Fallback**: `qwen2.5` serisi (0.5B, 7B) uyumluluk ve hız için yedektedir.
- **Specialist (Optional)**: Sadece ihtiyaç duyulduğunda `qwen3-coder` gibi uzmanlar eklenir.

## 4. Mimari İlkeler

- **Multi-Role Models**: Bir model birden fazla slotu (örn: Nano VL) başarıyla doldurabilir.
- **No-Leak Metadata**: Model detayları ve reasoning sadece dahili olarak kullanılır, client'a sadece sonuç ve status döner.
- **Resource Efficiency**: RTX 5060 (8GB VRAM) donanımını korumak için aynı anda maksimum 2 modelin bellekte kalması hedeflenir.

---
**Son Güncelleme**: 2026-05-16
**Durum**: Minimal Strategy Confirmed
