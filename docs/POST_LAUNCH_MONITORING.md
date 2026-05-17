# Aillame Yayın Sonrası İzleme ve Destek Planı (POST_LAUNCH_MONITORING.md)

Bu doküman, **Aillame Local AI Foundation** v1.3.0 sürümü yayınlandıktan sonraki ilk 24 saat ve sonrasındaki bakım, sorun triage (sınıflandırma), hotfix yönetimi ve geri bildirim mekanizmalarını tanımlamaktadır.

---

## 📅 1. İlk 24 Saat Kontrol Listesi (Post-Launch Checklist)
Yayınlamanın hemen ardından aşağıdaki kanallar aktif olarak takip edilmelidir:

1.  **İndirme ve Kurulum Sağlığı:**
    *   Farklı Windows 10 ve Windows 11 makinelerinden NSIS Setup (.exe) ve MSI paketlerinin sessiz veya normal yolla başarılı kurulup kurulmadığının doğrulanması.
    *   SmartScreen uyarıları ile ilgili kullanıcılara sağlanan dokümantasyonun (`SUPPORT_AND_TROUBLESHOOTING.md`) çalışıp çalışmadığı.
2.  **Port 3000 Çakışma Bildirimleri:**
    *   Özellikle web geliştiricisi olan kullanıcılardan gelebilecek "uygulama beyaz ekranda kalıyor / Next sunucusu başlamıyor" şikayetlerinin taranması.
3.  **Model Dizin Eşleşmeleri:**
    *   `C:\Aillame\Models\` dizini bulunamadığında, uygulamanın çökmeden (graceful degradation) doğru uyarıları verip vermediğinin kullanıcı ekranlarından teyit edilmesi.
4.  **Güvenlik Kalkanı False-Positive Analizi:**
    *   Central Safety Shield'ın normal sohbet girdilerini yanlışlıkla zararlı shell komutu gibi algılayıp algılamadığının (false-positive oranı) izlenmesi.

---

## 🚦 2. GitHub Issue Triage Planı (Sınıflandırma ve Öncelik)
Gelen kullanıcı hata bildirimleri (issues) şu öncelik matrisine göre sınıflandırılacaktır:

| Seviye | Öncelik Tanımı | Örnek Senaryo | Reaksiyon Süresi |
| :--- | :--- | :--- | :--- |
| **P0** | **Kritik Blocker** | Uygulama hiç açılmıyor, installer bozuk, güvenlik açığı/bypass tespiti. | **Anında (1-2 Saat)** |
| **P1** | **Ana Fonksiyon Kesintisi** | Sohbet yanıt vermiyor, yerel GGUF runtime başlamıyor, model health yanlış. | **Aynı Gün (12 Saat)** |
| **P2** | **Kullanıcı Deneyimi Engeli** | UI görsel bozulma, port çakışması uyarısı, model path eşleşmeme uyarısı. | **24-48 Saat** |
| **P3** | **Küçük İyileştirme / Öneri** | Dokümantasyon imla hatası, UX önerileri, yeni özellik talepleri. | **Gelecek Sürüm** |

---

## ⚡ 3. Hotfix / Yama Sürüm Planı (v1.3.1)
Eğer bir **P0** veya **P1** seviyesinde hata raporlanırsa, acil hotfix sürümü (`v1.3.1`) şu kurallarla yayına alınır:

1.  **Kapsam Sınırı:** Hotfix sadece bildirilen kritik hatayı düzeltmekle sınırlı kalmalıdır; yeni özellik eklemesi kesinlikle yasaktır.
2.  **Model Ayrımı Güvencesi:** Hotfix paketlerinde de model dosyaları kesinlikle installer'a gömülmez, dış yollar korunur.
3.  **Zorunlu Regresyon Testleri:**
    *   `npm run typecheck` ve `npm run build` hatasız tamamlanmalıdır.
    *   Phase 7.1, Phase 8.1 ve Phase 9 smoke test suite'leri çalıştırılarak %100 yeşil alınmalıdır.
    *   Tauri build alınarak yükleyici bütünlüğü test edilmelidir.
