# Aillame Değişiklik Günlüğü (CHANGELOG.md)

Tüm önemli değişiklikler bu dosyada belgelenecektir. Bu projenin sürüm şeması [Semantic Versioning (SemVer)](https://semver.org/lang/tr/) standartlarını takip eder.

---

## v1.4.0 - Local AI Usability Update

v1.4.0 sürümü, yerel yapay zeka deneyimini iyileştiren model yolu doğrulama, güvenli sohbet temizleme ve ana sohbet ekranındaki mobil/dropdown UX düzeltmelerini içerir.

### Added
*   **Model Yolu Doğrulama endpoint’i.**
*   **Settings içinde Model Yolu Doğrulama paneli.**
*   **`models.pathHealth` güvenli read-only tool’u.**
*   **Destek Özeti Kopyala butonu.**
*   **Sohbeti Temizle butonu.**
*   **Port 3000 health diagnostics.**
*   **Settings içinde İlk Açılış Rehberi / readiness paneli.**

### Fixed
*   **HIZLI dropdown’ın shortcut ikonlarının arkasında kalması.**
*   **Dropdown seçeneklerinin tıklanamaması.**
*   **390px mobil görünümde composer/sidebar taşması.**
*   **`model` kelimesindeki `del` alt dizisinin güvenlik kalkanında yanlış tetiklenmesi.**

### Changed
*   **Tiny SD artık kaldırılmış legacy model olarak gösteriliyor.**
*   **Tiny SD eksikliği hata sayılmıyor.**
*   **Mobilde sidebar başlangıçta kapalı geliyor.**
*   **Shortcut kartları mobilde 2 sütun grid’e geçiyor.**
*   **Model dosya boyutları okunabilir GB/MB formatında gösteriliyor.**
*   **`ensure-dev-port-free` artık otomatik process öldürmüyor; sadece raporluyor.**

### Security
*   **Model silme/indirme/geri yükleme istekleri engelleniyor.**
*   **Destek özeti token/env/şifre ve kişisel `C:\Users\...` yolu içermiyor.**
*   **Sohbeti Temizle hafıza/proje/dataset/registry/model dosyalarını silmiyor.**
*   **Port health process öldürmüyor, shell yetkisi eklemiyor.**

### Tests
*   `npm run typecheck`
*   `npm run build`
*   `phase22 25/25`
*   `phase24 9/9`
*   `phase25 18/18`
*   `phase7.1 7/7`
*   `phase8.1 11/11`
*   `phase9 17/17`
*   Açık/koyu tema dropdown testleri
*   390px / 768px responsive kontroller

### Known Notes
*   SDXL Turbo klasör boyutu metadata üzerinden hesaplanıyor; büyük klasörde kısa gecikme olabilir.
*   Çok dar cihazlarda sidebar mobil davranışı bilinçli olarak kapalı başlangıç kullanır.
*   Tiny SD eksikliği hata değildir.
*   Port 3000 çakışmasında Aillame process öldürmez; kullanıcıya manuel çözüm önerir.

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
