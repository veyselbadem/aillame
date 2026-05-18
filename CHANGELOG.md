# Aillame Değişiklik Günlüğü (CHANGELOG.md)

Tüm önemli değişiklikler bu dosyada belgelenecektir. Bu projenin sürüm şeması [Semantic Versioning (SemVer)](https://semver.org/lang/tr/) standartlarını takip eder.

---

## Unreleased - v1.4.0-dev

v1.4.0-dev hatti, v1.3.0 stabil release tag'ini degistirmeden model yolu dogrulama, guvenli sohbet temizleme ve ana sohbet ekranindaki mobil/dropdown UX duzeltmelerini toplar.

### Added
*   **Model Yolu Dogrulama Endpoint'i:** `/api/aillame/models/path-health` aktif yerel model yollarini read-only olarak denetler.
*   **Settings Model Yolu Dogrulama Paneli:** Qwen3-VL 4B, SDXL Turbo, Aillame Nano ve Tiny SD legacy durumlarini kullaniciya ozetler.
*   **models.pathHealth Tool'u:** Nano safe tool-use hatti uzerinden model yolu saglik bilgisini guvenli sekilde raporlar.
*   **Destek Ozeti Kopyala:** Model yolu durumunu paylasilabilir, secret ve kisisel path icermeyen bir destek metnine donusturur.
*   **Sohbeti Temizle:** Aktif sohbet ekranindaki mesajlari, taslagi ve aktif gorsel eki temizleyen UI aksiyonu geri getirildi.
*   **Ilk Acilis Rehberi / İlk Açılış Rehberi:** Ayarlar ekraninda model dosyalari, Port 3000, yerel veri ve guvenlik durumunu read-only olarak ozetleyen onboarding/readiness paneli eklendi.

### Fixed
*   **HIZLI Dropdown Layering:** Hiz secici menunun shortcut ikon kartlarinin arkasinda kalmasi giderildi.
*   **Dropdown Tiklanabilirligi:** Dropdown acikken secenek tiklamalarinin alttaki ikon/kart tarafindan yakalanmasi engellendi.
*   **390px Mobil Layout:** Dar mobil ekranda composer, sidebar, hiz selector ve shortcut kartlari viewport disina tasmayacak sekilde duzeltildi.
*   **Safety False Positive:** `model` kelimesindeki `del` alt dizesinin yanlis silme alarmi uretmesi duzeltildi.

### Changed
*   **Tiny SD Legacy Durumu:** Tiny SD artik kaldirilmis legacy/opsiyonel model olarak net gosterilir; eksikligi hata sayilmaz.
*   **Mobil Sidebar Varsayilani:** Dar ekranlarda sidebar baslangicta kapali gelir.
*   **Shortcut Mobil Grid:** Shortcut ikonlari mobilde iki sutun grid olarak sarilir.
*   **Okunabilir Dosya Boyutlari:** Model yolu saglik panelinde dosya boyutlari GB/MB formatinda gosterilir.
*   **Readiness UX:** Port durumu karti, model yolu karti, yerel veri notu ve guvenlik notu tek rehber alaninda toplandi.

### Security
*   **Read-only Model Health:** Model silme, indirme, duzenleme veya geri yukleme istekleri engellenir.
*   **Gizli Veri Koruma:** Destek ozeti token, `.env`, sifre, private key veya `C:\Users\...` gibi kisisel kullanici yolu icermez.
*   **Safe Chat Clearing:** Sohbeti Temizle hafiza, proje baglami, distillation dataset, registry veya yerel dosyalari silmez.
*   **Read-only Onboarding:** Ilk Acilis Rehberi dosya indirmez, silmez, process kapatmaz, shell/PowerShell/CMD calistirma yetkisi eklemez.

### Tests
*   `npm run typecheck` gecti.
*   `npm run build` gecti.
*   `npx tsx scripts/smoke-phase22-model-path-health-validation.ts` 25/25 gecti.
*   `npx tsx scripts/smoke-phase25-onboarding-readiness-validation.ts` onboarding/readiness kaynaklarini ve UI metinlerini dogrular.
*   `npx tsx scripts/smoke-phase7.1-all-validations.ts` 7/7 gecti.
*   `npx tsx scripts/smoke-phase8.1-project-context-validation.ts` 11/11 gecti.
*   `npx tsx scripts/smoke-phase9-distillation-dataset-validation.ts` 17/17 gecti.
*   Acik/koyu tema dropdown testleri gecti.
*   390px ve 768px responsive dropdown/layout testleri gecti.

### Known Notes
*   SDXL Turbo klasor boyutu metadata uzerinden hesaplanir; cok buyuk klasorlerde kisa gecikme olabilir.
*   Clipboard fallback kodu mevcuttur; otomasyon ortaminda fallback her zaman tetiklenmeyebilir.
*   Tiny SD eksikligi hata degildir; legacy/opsiyonel model olarak raporlanir.

---

## [v1.3.0-local-ai-foundation] - 2026-05-17

Aillame masaüstü uygulamasının yerel kaynaklarla çalışan zırhlı ve sıfır bulut bağımlılıklı AI altyapısının genel yayına hazır ilk kararlı sürümüdür.

### 🌟 Added (Eklenenler)
*   **Aillame Nano Cognitive Router (v1/v2):** Türkçe stem-matching analizörlü yerel yönlendirici.
*   **Qwen3-VL 4B Vision Entegrasyonu:** Dış yollardan (`C:\Aillame\Models`) beslenen local multimodal görsel anlama motoru.
*   **SDXL Turbo Entegrasyonu:** Preflight kaynak denetimli görsel üretim pipeline'ı.
*   **SafeRuntime ve GPU Heavy Lock:** HP Omen donanımını koruyan kaynak kısıtlama kuralları ve singleton GPU işlem kilidi.
*   **Yerel Hafıza ve Proje Bağlamı:** Self-healing özellikli yerel JSON veritabanı altyapısı ve otomatik prompt enjeksiyonları.
*   **Local Distillation Dataset:** Kullanıcı onayına tabi, hassas veri maskelemeli ve export destekli Türkçe model öğrenme veri seti hazırlığı.
*   **Tauri v2 Windows Installer:** NSIS Setup (.exe) ve Windows Installer (.msi) paketleri.

### 🔒 Security (Güvenlik Geliştirmeleri)
*   **Central Safety Shield:** Kötü niyetli shell komutlarını (`powershell`, `cmd.exe`) ve dosya sızıntı denemelerini (`.env` okuma) bloke eden zırhlı koruma kalkanı.
*   **Tauri Least Privilege Sandbox:** Shell komutu çalıştırma izinleri sidecar ile sınırlandırılmış, dosya sistemi dialoglar dışındaki alanlar için kapatılmıştır.

### ⚠️ Known Limitations (Bilinen Sınırlamalar)
*   Otomatik güncelleme (Auto-Updater) şu an aktif değildir; yeni sürümler GitHub Releases üzerinden indirilen installer'lar ile manuel kurulmalıdır.
*   SDXL görsel üretimi asgari 8 GB RAM ve 6.5 GB Boş VRAM gerektirir.

### 🔄 Uninstallation (Kaldırma)
*   Uygulama kaldırıldığında büyük model dizinleri (`C:\Aillame\Models`) ve kullanıcı veri tabanları (`.aillame-data`) diskte güvenle korunur, silinmez.
