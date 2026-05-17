# Aillame Bakım ve Hata Giderme Kılavuzu (SUPPORT_AND_TROUBLESHOOTING.md)

Bu doküman, **Aillame Local AI Foundation** masaüstü uygulamasının çalıştırılması sırasında karşılaşılabilecek olası sorunları, çözüm adımlarını ve hata raporlama standartlarını içerir.

---

## 🔍 1. Kurulum ve Başlangıç Sorunları

### A) Windows SmartScreen Uyarısı
*   **Açıklama:** Yeni derlenmiş veya imzasız Tauri uygulamalarında Windows Defender SmartScreen "Bilgisayarınız korundu" uyarısı gösterebilir.
*   **Çözüm:** Bu durum son derece normaldir. Uyardığında **"Ek Bilgi"** linkine tıklayın ve ardından çıkan **"Yine de Çalıştır"** butonuna basarak kurulumu güvenle sürdürün.

### B) Port 3000 Çakışması (Next.js Sunucusu)
*   **Açıklama:** Aillame, arka planda 3000 portundan hizmet alan yerel bir sunucu başlatır. Başka bir uygulama (örn. başka bir React/Next projesi) 3000 portunu kullanıyorsa Aillame açılamaz.
*   **Çözüm:** 
    1.  Terminali açıp `npm run ensure-dev-port-free.mjs` komutunu çalıştırarak çakışan süreci temizleyin.
    2.  Veya `.env` dosyasındaki `AILLAME_LOCAL_SERVER_PORT` değerini boş bir porta (örn. 3005) güncelleyin.

---

## 🧠 2. Yerel AI ve Model Sorunları

### A) Model "Eksik" (Missing) Görünüyor
*   **Açıklama:** Aillame Nano chat çalışıyor fakat Görsel Analiz (Qwen3-VL 4B) veya Görsel Üretim (SDXL) yetenekleri aktif değil.
*   **Çözüm:**
    *   Qwen3-VL 4B için `C:\Aillame\Models\nano\qwen3-vl-4b\` dizininde hem `model.gguf` hem de `mmproj.gguf` dosyalarının fiziksel olarak mevcut olduğundan emin olun.
    *   SDXL Turbo için `C:\aillame-models\diffusion\` dizininde model ağırlıklarının bulunduğunu doğrulayın.
    *   *Not: Model dosyaları eksikse uygulama çökmez; Nano Lab veya Ayarlar ekranından model durumunu inceleyebilirsiniz.*

### B) SDXL Turbo Görsel Üretim Hataları
*   **Açıklama:** Resim oluşturmak istediğinizde donanım yetersiz veya kilitli hatası alınıyor.
*   **Çözüm:** SDXL Turbo motorunun çalışabilmesi için sistemde en az **8 GB RAM** ve **6.5 GB Boş VRAM** bulunması gerekir. Kaynaklar yetersizse SafeRuntime koruma sınırı işlemi güvenle durdurur.

---

## 🛡️ 3. Güvenlik ve Veri Gizliliği

### A) "Bu işlem güvenlik nedeniyle engellendi" Mesajı
*   **Açıklama:** Prompt içinde `powershell`, `cmd`, `.env`, `rm -rf` vb. ifadelere yer verildiğinde Central Safety Shield devreye girer.
*   **Çözüm:** Aillame Nano yerel dosya silme veya serbest terminal çalıştırma yetkilerine sahip değildir. Yalnızca sistem sağlığı (`system.health`) veya model durumu (`models.status`) gibi read-only araçları kullanabilirsiniz.

### B) Hata Raporlarında Hassas Veri Paylaşımı
*   > [!IMPORTANT]
     > GitHub üzerinde hata bildirimi yaparken veya log dosyalarını paylaşırken **ASLA** şifrelerinizi, API anahtarlarınızı (`sk-proj-...`), kredi kartı bilgilerinizi veya `.env` dosyalarınızın ham içeriğini paylaşmayın! Hata loglarını göndermeden önce bu verileri maskelediğinizden emin olun.

---

## 🔄 4. Kaldırma (Uninstall) Sonrası Veri Koruma
*   Aillame kaldırıldığında (uninstall), diskinizdeki büyük model dosyalarına (`C:\Aillame`) ve kullanıcı veri tabanlarına (`.aillame-data`) kesinlikle dokunulmaz.
*   Eğer tüm verileri sıfırlamak istiyorsanız, kaldırma işlemi sonrasında `.aillame-data/` klasörünü manuel olarak silebilirsiniz.
