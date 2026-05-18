# Aillame Bakım ve Hata Giderme Kılavuzu (SUPPORT_AND_TROUBLESHOOTING.md)

Bu doküman, **Aillame Local AI Foundation** masaüstü uygulamasının çalıştırılması sırasında karşılaşılabilecek olası sorunları, çözüm adımlarını ve hata raporlama standartlarını içerir.

---

## 🔍 1. Kurulum ve Başlangıç Sorunları

### A) Windows SmartScreen Uyarısı
*   **Açıklama:** Yeni derlenmiş veya imzasız Tauri uygulamalarında Windows Defender SmartScreen "Bilgisayarınız korundu" uyarısı gösterebilir.
*   **Çözüm:** Bu durum son derece normaldir. Uyardığında **"Ek Bilgi"** linkine tıklayın ve ardından çıkan **"Yine de Çalıştır"** butonuna basarak kurulumu güvenle sürdürün.

### B) Port 3000 Çakışması (Next.js Sunucusu)
*   **Açıklama:** Aillame, arka planda 3000 portundan hizmet alan yerel bir sunucu başlatır. Başka bir uygulama (örn. başka bir React/Next projesi) 3000 portunu kullanıyorsa Aillame açılamaz.
*   **Kullanıcı mesajı:** "Aillame yerel sunucusu başlatılamadı. 3000 portu başka bir uygulama tarafından kullanılıyor olabilir."
*   **Çözüm:**
    1.  Açık olan başka Next.js, React veya yerel geliştirme sunucularını kapatıp Aillame'i tekrar başlatın.
    2.  Geliştirici ortamında `node scripts/ensure-dev-port-free.mjs` komutu port sahibini raporlar; Aillame başka process'leri otomatik sonlandırmaz.
    3.  Gerekirse `.env` dosyasındaki `AILLAME_LOCAL_SERVER_PORT` değerini boş bir porta (örn. 3005) güncelleyin ve Tauri/Next ayarlarıyla uyumlu olduğundan emin olun.
*   **Tanılama:** Masaüstü Hazırlığı ekranındaki "Port Durumu" satırı `Kullanılabilir`, `Aillame Çalışıyor` veya `Çakışma` durumunu gösterir. `Aillame Çalışıyor`, runtime'ın kendi portunu yanlış çakışma saymadığı anlamına gelir.

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

### C) Model Yolu Doğrulama
*   **Açıklama:** Ayarlar ekranındaki **Model Yolu Doğrulama** paneli, Qwen3-VL 4B, SDXL Turbo ve Aillame Nano dosyalarının beklenen yerlerde olup olmadığını kontrol eder.
*   **Kontrol edilen yollar:** `C:\Aillame\Models\nano\qwen3-vl-4b\model.gguf`, `C:\Aillame\Models\nano\qwen3-vl-4b\mmproj.gguf`, `C:\aillame-models\diffusion\sdxl-turbo-1.0`, `C:\aillame-models\diffusion\sd_xl_turbo_1.0_fp16.safetensors`, `public/model/aillame-v1` ve `src/core/engine/checkpoints`.
*   **Güvenlik notu:** Bu kontrol yalnızca okuma yapar; model indirmez, silmez, taşımaz veya dosya içeriğini değiştirmez. GGUF dosyalarında sadece ilk 4 byte imza kontrolü yapılır.
*   **Tiny SD:** Tiny SD artık aktif/korunan model değildir. `C:\aillame-models\diffusion\tiny-sd` yoksa hata sayılmaz; varsa legacy/opsiyonel/pasif olarak raporlanır.
*   **Panel bilgileri:** Ayarlar panelinde son kontrol zamanı, hazır/eksik/uyarı/legacy özet sayaçları ve kısa genel durum mesajı görünür.
*   **Destek özeti:** **Destek Özeti Kopyala** butonu ile model yolu durumunu kısa ve paylaşılabilir bir destek metni olarak panoya kopyalayabilirsiniz.
*   **Gizlilik:** Destek özeti token, şifre, `.env` içeriği veya kişisel kullanıcı yolu içermez; yalnızca dosya varlığı, boyut, durum ve temel GGUF imza bilgisini özetler.
*   **Eksik ana model:** Qwen3-VL 4B eksikse Nano Lab’daki Vision Health kartına, SDXL Turbo eksikse Görsel Üretim Durumu kartına bakın.

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

---

## 5. Sohbeti Temizle
*   **Açıklama:** Sohbet ekranındaki **Sohbeti Temizle** butonu yalnızca aktif ekranda görünen sohbet mesajlarını temizler.
*   **Kapsam:** Mevcut mesaj listesi, yazma alanındaki taslak metin ve aktif görsel ek temizlenir.
*   **Veri güvenliği:** Aillame Hafızası, Proje Bağlamı, Nano Öğrenme/Distillation verileri, model registry kayıtları ve yerel model dosyaları silinmez veya değiştirilmez.
*   **Kalıcı veri yönetimi:** Hafıza, proje bağlamı veya öğrenme verilerini yönetmek için Ayarlar ekranındaki ilgili paneller kullanılmalıdır.
