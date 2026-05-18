# Aillame Geliştirme Yol Haritası (ROADMAP.md)

Bu doküman, **Aillame Local AI Foundation** projesinin yayın sonrası bakım politikasını, kısa-orta vadeli `v1.4.0` aday özelliklerini ve uzun vadeli `v1.5.0` vizyonunu tanımlamaktadır.

---

## 🚨 1. v1.3.1 Hotfix (Acil Yama) Politikası
Acil bir yama sürümü (`v1.3.1`) yalnızca ve yalnızca aşağıdaki **kritik (blocker)** durumlarda tetiklenir:
*   Windows MSI veya NSIS installer'ın açılmaması veya işletim sisteminde yükleme hatası vermesi.
*   Uygulamanın ilk açılışta veya yerel Next sunucusu başlarken dynamic link/çakışma sebebiyle çökmesi.
*   Central Safety Shield prompt koruma kalkanının bypass edilmesi (ciddi sızıntı riski).
*   Sohbet motorunun yerel GGUF inference yaparken tamamen kilitlenmesi veya çalışmaması.
*   Yerel veritabanında (`.aillame-data`) veri kaybına yol açan bir bug tespit edilmesi.

> [!WARNING]
> **Hotfix Kapsam Dışı (Non-Goals for v1.3.1):** Yeni özellik ekleme, yeni model desteği, arayüz makyajlama, model eğitimi veya büyük mimari değişiklikler hotfix kapsamına kesinlikle alınamaz.

---

## 📊 2. Önceliklendirme ve Risk Analizi Matrisi

| Özellik Adı | Öncelik Seviyesi | Risk Seviyesi | Mimari Etki |
| :--- | :--- | :--- | :--- |
| **Model Path Doğrulama Sihirbazı** | **Must-Have** | **Düşük** | UX / Ayarlar |
| **Port 3000 Çakışma Tanısı ve Uyarısı** | **Must-Have** | **Düşük** | Sunucu Başlangıcı |
| **Hafıza Düzenleme ve İçe/Dışa Aktarma** | **Should-Have** | **Düşük** | Hafıza Servisi |
| **Görsel Sohbet Geçmişi ve Önizleme** | **Should-Have** | **Orta** | VLM Inference |
| **Read-only Doküman Arama ve Test Araçları** | **Should-Have** | **Düşük** | Safe Tool-Use |
| **Dataset Kalite Puanı & Çift Kayıt Analizi** | **Nice-to-Have** | **Düşük** | Distillation |
| **Otomatik Güncelleyici (Auto-Updater)** | **Nice-to-Have** | **Yüksek** | Tauri / İmzalama |
| **Model Performans Benchmark Dashboard** | **Nice-to-Have** | **Düşük** | Diagnostic |
| **Yerel LoRA Eğitim/Fine-tuning Arayüzü** | **Later** | **Yüksek** | Donanım Sınırları |
| **Çoklu Model Paralel Çalıştırma (Inference)**| **Later** | **Yüksek** | VRAM / GPU Lock |

---

## 🛡️ 3. Güvenlik Sınırları ve Kırmızı Çizgiler (Non-Goals)
Aillame'in yerel AI güvenliği ilkelerine sadık kalmak adına aşağıdaki hedefler **kesinlikle yol haritasına dahil edilmez**:
1.  **Serbest Shell/Powershell/CMD Yetkisi:** Uygulamaya hiçbir koşulda kontrolsüz yerel komut çalıştırma yeteneği eklenmeyecektir.
2.  **Dosya Silme ve Değiştirme Yetkileri:** Güvenli yerel araçlar (tool-use) her zaman salt-okunur (read-only) kalacak; dosya silme veya kod düzenleme yetkisi verilmeyecektir.
3.  **İzinsiz Telemetri ve Veri Toplama:** Kullanıcı sohbetleri veya öğrenme verileri kesinlikle arka planda bir bulut sunucusuna gönderilmeyecek, tüm zeka yerelde saklanacaktır.

---

## 🚀 4. Sürümler Arası Geçiş Test Standartları
Herhangi bir minor (`v1.4.0`) veya patch (`v1.3.1`) yayını öncesinde aşağıdaki test suite'lerinin sıfır hata ile geçmesi zorunludur:
- `npm run typecheck` ve `npm run build`
- `npx tsx scripts/smoke-phase7.1-all-validations.ts`
- `npx tsx scripts/smoke-phase8.1-project-context-validation.ts`
- `npx tsx scripts/smoke-phase9-distillation-dataset-validation.ts`
- `npx tsx scripts/smoke-phase22-model-path-health-validation.ts`
- Tauri MSI ve EXE paketlemesinin yerelde başarıyla tamamlanması.

---

## 5. v1.4.0 Model Yolu Doğrulama Sihirbazı

Durum: **v1.4.0-dev hattinda tamamlandi.**

Model Yolu Doğrulama Sihirbazı, kullanıcının kurulumdan sonra yerel model dosyalarının doğru yerde olup olmadığını Ayarlar ekranından read-only olarak kontrol etmesini sağlar.

Kontrol edilen aktif yollar:
- Qwen3-VL 4B Nano Vision: `C:\Aillame\Models\nano\qwen3-vl-4b\model.gguf` ve `mmproj.gguf`
- SDXL Turbo: `C:\aillame-models\diffusion\sdxl-turbo-1.0` ve `sd_xl_turbo_1.0_fp16.safetensors`
- Aillame Nano: `public/model/aillame-v1` ve `src/core/engine/checkpoints`

Bu özellik dosya indirmez, silmez, taşımaz veya düzenlemez. Tiny SD artık aktif/korunan model değildir; bulunmaması hata sayılmaz ve yalnızca legacy/opsiyonel durum olarak raporlanır.

Faz 22.1 ile Ayarlar paneline son kontrol zamanı, hazır/eksik/uyarı/legacy özet sayaçları ve daha açık Tiny SD açıklaması eklenmiştir. Tiny SD “Kaldırılmış Legacy” olarak ele alınır; eksikliği ana sistemi etkilemez.

Faz 22.2 ile **Sohbeti Temizle** butonu güvenli bir UI aksiyonu olarak geri getirildi. Bu aksiyon yalnızca aktif sohbet ekranındaki mesajları, taslak metni ve aktif görsel eki temizler; Hafıza, Proje Bağlamı, Nano Öğrenme/Distillation verileri, model registry ve yerel dosyalar etkilenmez.

Faz 22.3 ile Model Yolu Doğrulama paneline **Destek Özeti Kopyala** eklendi. Bu özet token, şifre, `.env` içeriği veya kişisel kullanıcı yolu içermez; yalnızca dosya varlığı, boyut, durum ve temel GGUF imza bilgisini paylaşılabilir şekilde özetler. Tiny SD kaldırılmış legacy model olarak kalır; eksikliği hata değildir.

Faz 23.1 ve 23.2 ile ana sohbet ekranindaki **HIZLI** hiz secici dropdown'unun shortcut ikon kartlarinin arkasinda kalmasi ve secenek tiklamalarinin alttaki kartlar tarafindan yakalanmasi duzeltildi. Dropdown/composer/shortcut stacking sirasi netlestirildi; runtime veya model davranisi degistirilmedi.

Faz 23.3 ile 390px mobil ekranda composer, hiz secici ve shortcut kartlari viewport disina tasmayacak sekilde responsive duzen guncellendi. Mobilde sidebar baslangicta kapali gelir, kapali sidebar bos alan birakmaz ve shortcut kartlari iki sutun grid olarak sarilir.

### v1.4.0 Tamamlananlar
- Model Yolu Doğrulama
- Destek Özeti Kopyala
- Sohbeti Temizle
- HIZLI dropdown fix
- Mobil responsive layout fix
- Port 3000 health diagnostics
- İlk Açılış Rehberi / readiness paneli

### v1.4.0'dan Sonra Kalan Adaylar
- Model path wizard adım adım sorun giderme
- Hafıza düzenleme / export-import
- Proje presetleri
- SDXL prompt presetleri
- Daha gelişmiş onboarding modalı
- Otomatik updater, code signing sonrası ileride değerlendirilecek

### Non-Goals (Kesinlikle Yapılmayacaklar)
- Shell execution yok.
- Dosya silme/taşıma/yazma tool’u yok.
- Model dosyaları release içine gömülmez.
- Fine-tuning bu sürümde yok.

## 6. v1.4.0 Port 3000 Tanilama ve Uyari Akisi

Durum: **v1.4.0-dev hattinda tamamlandi.**

Aillame yerel Next/Node sunucusu varsayilan olarak `127.0.0.1:3000` uzerinden calisir. Faz 24 ile bu port icin read-only saglik kontrolu eklendi:
- Port bossa `Kullanilabilir` olarak raporlanir.
- Port Aillame health endpoint'i tarafindan yanitlaniyorsa `Aillame calisiyor` olarak raporlanir ve false-positive conflict uretilmez.
- Port dolu ama Aillame health yaniti yoksa kullaniciya `3000 portu baska bir uygulama tarafindan kullaniliyor olabilir` uyarisi gosterilir.

Bu akis baska process'i otomatik oldurmez, serbest shell/PowerShell/CMD yetkisi eklemez ve kullanicidan onay almadan port degistirmez.

## 7. v1.4.0 Ilk Acilis Rehberi ve Readiness UX

Durum: **v1.4.0-dev hattinda tamamlandi.**

Faz 25 ile Ayarlar ekranina **İlk Açılış Rehberi** eklendi. Rehber ilk acilista kullanicinin sistemin temel hazirlik durumunu anlamasini saglar:
- Yerel Sunucu karti Port 3000 durumunu read-only olarak gosterir.
- Model Dosyalari karti Qwen3-VL 4B, SDXL Turbo, Aillame Nano ve Tiny SD durumlarini ozetler.
- Tiny SD kaldirilmis legacy modeldir; eksikligi hata degildir.
- Yerel Veri karti hafiza, proje baglami ve ogrenme verilerinin cihazda saklandigini anlatir.
- Guvenlik karti Shell/PowerShell/CMD serbest calistirilmayacagini, token/env/sifre gosteriminin engellendigini ve model dosyalarinin otomatik silinmeyecegini/indirilmeyecegini belirtir.

Bu rehber yeni model indirmez, inference baslatmaz, process kapatmaz ve runtime/model davranisini degistirmez. Aksiyonlari yalnizca `GET /api/aillame/models/path-health`, `GET /api/aillame/runtime/port-health` ve mevcut **Destek Ozeti Kopyala** akisini kullanir.

## 8. v1.4.1 Hotfix UI ve IndexedDB Budama

Durum: **main hattında tamamlandı.**

v1.4.1 hotfix sürümü, v1.4.0 sürümünün yayınlanmasının ardından kullanıcılardan gelen geri bildirimler doğrultusunda geliştirilmiştir:
- **Açık Tema Kontrast Düzeltmeleri:** Açık tema altında okunabilirliği düşük olan İlk Açılış Rehberi kartları, durum rozetleri, donanım hata kutuları, AI Lab uyarı panelleri ve Projeler sayfası kategori/açıklama metinleri yüksek kontrastlı ve tema-duyarlı olacak şekilde iyileştirilmiştir.
- **Kalıcı Sohbet Temizleme:** Sohbeti Temizle butonunun, sadece React durumunu temizlemekle kalmayıp, arka planda **IndexedDB** veritabanı düzeyinde ilgili konuşma mesajlarını fiziksel ve kalıcı olarak budaması (pruning) doğrulanmıştır.
- **Güvenlik Korunumu:** Bu hotfix ile hiçbir yeni model indirilmemiş, silinmemiş veya runtime davranışı değiştirilmemiştir. Model dosyaları (`C:\Aillame\Models`) ve kullanıcı verileri (`.aillame-data`) Tauri installer paketine gömülmez ve uninstaller çalıştırıldığında diskten silinmez.
