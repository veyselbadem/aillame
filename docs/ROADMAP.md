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
| **Port 3000 Çakışma Otomatik Kurtarma** | **Must-Have** | **Düşük** | Sunucu Başlangıcı |
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
- Tauri MSI ve EXE paketlemesinin yerelde başarıyla tamamlanması.
