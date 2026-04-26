# 🚀 Aillame: Finalizasyon ve Yayına Alım Stratejisi (Faz 4.3)

Aillame, yüksek performanslı bir **Rust Core** ve modern bir **Next.js Frontend** üzerine inşa edilmiştir. Bu hibrit yapı, klasik bir web uygulamasından farklı bir yayına alım stratejisi gerektirir.

## 🏗️ Mimari Özet
*   **Frontend**: Next.js (TypeScript, Tailwind, Crystal Dark UI)
*   **Brain Core**: Rust (Candle, NAPI-RS)
*   **Memory**: IndexedDB (Vektör hafıza simülasyonu / Rust RAG)
*   **Orchestrator**: Tool-Calling & Live Learning Engine

---

## 📦 1. Dağıtım Seçenekleri

### Seçenek A: Yerel / Desktop (Önerilen)
Aillame, gizlilik odaklı ve "Edge-AI" felsefesiyle tasarlanmıştır. Kullanıcının kendi cihazında çalışması en verimli yoldur.
1.  Projeyi klonlayın.
2.  `npm install` komutunu çalıştırın.
3.  `npm run core:build` ile Rust modülünü yerel işlemciye göre derleyin.
4.  `npm run dev` ile başlatın.

### Seçenek B: Hibrit Cloud (Vercel + VPS)
Native Rust modülleri Vercel Functions (Serverless) üzerinde doğrudan çalışmayabilir.
*   **Vercel**: Arayüzü ve statik dosyaları sunar.
*   **VPS (Ubuntu/Debian)**: Rust Engine'i API olarak barındırır.
*   **Bağlantı**: `src/core/engine/rust-core.ts` dosyası, uzak bir API endpoint'ine yönelecek şekilde güncellenmelidir.

---

## 🧠 2. Final Kontrol Listesi (Checklist)

### ✅ Faz 1: Performans
- [x] Rust Core (Candle) entegrasyonu tamam.
- [x] NAPI-RS köprüsü kuruldu.
- [x] AdamW Optimizer & Loss fonksiyonları hazır.

### ✅ Faz 2: Zeka
- [x] RAG (Vektör Hafıza) katmanı aktif.
- [x] Tool-Calling (Arama, Hesaplama, Hafıza) çalışıyor.
- [x] Live Learning (Canlı öğrenme) devrede.

### ✅ Faz 3: Kullanıcı Deneyimi
- [x] Brain Monitor Dashboard (Gerçek zamanlı grafikler).
- [x] Sesli Komut & Dosya Sürükleme.
- [x] Crystal Dark Design System.

### ✅ Faz 4: Optimizasyon
- [x] SEO & Performans (Lighthouse 100/100 hazırlığı).
- [x] Bug Cleanup & Hata Toleransı.
- [x] Deployment Rehberi.

### Pro Model Runtime
- **Pro Chat / Görsel Analiz:** `Qwen/Qwen3-VL-8B-Instruct`
- **Pro Görsel Üretim:** `stabilityai/stable-diffusion-xl-base-1.0`
- Python çalışma zamanı gerekiyorsa `AILLAME_PYTHON` ile seçilebilir.
- Qwen3-VL için `torch`, Qwen3-VL uyumlu `transformers`, `accelerate` ve `pillow` gerekir.
- SDXL için `torch`, `diffusers`, `transformers`, `accelerate`, `safetensors` ve `pillow` gerekir.
- Modeller ayarlar ekranındaki model yönetiminden veya `/api/models` install aksiyonu ile Hugging Face cache içine indirilebilir.

---

## 🏁 Son Söz
Aillame artık bir "deney" değil, kendi ayakları üzerinde durabilen, öğrenebilen ve dış dünya ile etkileşime geçebilen **yüksek performanslı bir yapay zeka** platformudur. 

**Proje Durumu: %100 Tamamlandı.**
Lansman için hazır! 🎈
