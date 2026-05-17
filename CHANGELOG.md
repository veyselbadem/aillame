# Aillame Değişiklik Günlüğü (CHANGELOG.md)

Tüm önemli değişiklikler bu dosyada belgelenecektir. Bu projenin sürüm şeması [Semantic Versioning (SemVer)](https://semver.org/lang/tr/) standartlarını takip eder.

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
