# Workspace Agent Plan/Review Flow

## 1. Amaç
Bu sistemin amacı, Workspace Agent'ın kullanıcı hedeflerine yönelik planlarını güvenli, yürütülemez (non-executable) ve denetlenebilir bir şekilde üretmek ve kullanıcıya sunmaktır. Sistemin temel odağı, herhangi bir dosya yazma veya komut çalıştırma işlemi yapmadan önce planın risklerini ve adımlarını şeffaf hale getirmektir.

## 2. Bu Sistem Ne Değildir?
- **Execution Sistemi Değildir:** Onaylanan adımlar bu aşamada çalıştırılmaz.
- **File Write Sistemi Değildir:** Dosya değişikliği veya yazımı yapmaz.
- **Shell Runner Değildir:** Terminal komutlarını yürütmez.
- **ActionExecutor Değildir:** Eylem yürütücü motoru içermez.
- **Command Registry Değildir:** Komut kayıt defteri ile etkileşime girmez.
- **RAG Sistemi Değildir:** Otomatik belge geri çağırma yapmaz.
- **Chat/Nano Prompt Injection Sistemi Değildir:** Çıktıları otomatik olarak modele enjekte etmez.
- **Persistence Sistemi Değildir:** Planlar veya incelemeler diske kaydedilmez.

## 3. Fazlara Göre Mimari Özet
- **Faz 47 (Planning Boundary):** Plan üretimi için katı sınırlar ve yürütme yasağı (no execution) getirildi.
- **Faz 48 (Plan Preview UI):** Üretilen planın kullanıcı tarafından görsel olarak incelenebileceği Admin UI eklendi.
- **Faz 49 (Review / Approval Skeleton):** Plan adımlarının "gelecek için onaylı" veya "reddedildi" olarak işaretlenebileceği state katmanı eklendi.
- **Faz 50 (Review Summary Export):** İnceleme sonuçlarının güvenli, metin tabanlı özetinin oluşturulması sağlandı.

## 4. Uçtan Uca Akış
1. **User Goal:** Kullanıcı bir hedef belirler.
2. **createWorkspaceAgentPlan:** Hedef analiz edilir ve politika sınırları dahilinde plan üretilir.
3. **Plan-only Output:** Üretilen plan `executable=false` bayrağı ile çıkar.
4. **Plan Preview UI:** Kullanıcı adımları, riskleri ve uyarıları görür.
5. **Step Review State:** Kullanıcı her adımı inceler ve durumunu günceller (In-memory).
6. **Review Summary:** İnceleme tamamlandığında özet metin oluşturulur.
7. **Optional Manual Clipboard Copy:** Kullanıcı dilerse özeti manuel olarak kopyalar.

## 5. Güvenlik Sınırları
- Plan adımları her zaman `executable=false` kalır.
- ActionExecutor ve Command Registry üzerinden hiçbir eylem tetiklenmez.
- Shell komutları ve dosya yazma işlemleri kesinlikle yasaktır.
- İnceleme state'i (Review State) sadece uygulama belleğinde (in-memory) tutulur, hiçbir depolama birimine yazılmaz.
- Özet çıktısı (Summary) kalıcı değildir (non-persistent).
- Özet içeriği Chat/Nano promptuna otomatik olarak eklenmez.
- Hassas veriler (Full path, secret, PID, stack trace vb.) sanitizer katmanı tarafından maskelenir.
- UI'da "Run", "Execute", "Apply" veya "Save to File" butonları bulunmaz.

## 6. Önemli Dosyalar ve Sorumlulukları

### Planning (Çekirdek Mantık)
- `planning-types.ts`: Plan ve adım veri yapıları.
- `planning-policy.ts`: Plan üretim kuralları ve kısıtlamaları.
- `planning-sanitizer.ts`: Girdi ve çıktıların güvenlik taraması ve maskelemesi.
- `planning-boundary.ts`: Plan üretim motoru ve sınır kontrolü.
- `plan-preview-presenter.ts`: Planın UI için görselleştirme verisine dönüştürülmesi.
- `plan-review-types.ts`: İnceleme state'i tipleri.
- `plan-review-state.ts`: İnceleme durumu yönetimi ve not sanitasyonu.
- `plan-review-summary-types.ts`: Özet çıktısı tipleri.
- `plan-review-summary.ts`: Güvenli metin özeti oluşturucu (Summary Builder).

### Hooks (Durum Yönetimi)
- `useWorkspaceAgentPlanPreview.ts`: Plan oluşturma ve önizleme mantığı.
- `useWorkspaceAgentPlanReview.ts`: İnceleme state'i ve özet üretimi yönetimi.

### UI (Bileşenler)
- `WorkspaceAgentPlanPreview.tsx`: Ana plan önizleme ve inceleme ekranı.
- `WorkspaceAgentPlanStepItem.tsx`: Tekil plan adımı ve inceleme kontrolleri.
- `WorkspaceAgentPlanWarnings.tsx`: Uyarı ve risklerin listelenmesi.
- `WorkspaceAgentReviewSummaryPanel.tsx`: Özet çıktısı ve kopyalama paneli.
- `app/admin/workspace-agent-plan/page.tsx`: Admin rotası ve sayfa yapısı.

## 7. Plan-only Contract
Sistem, `mode: "plan_only"` kontratı üzerinden çalışır. Bu modda üretilen her adımın `executable` değeri `false` olmak zorundadır. Adımlar shell komutu veya dosya yazma payload'ı taşıyamaz.

## 8. Preview UI Davranışı
UI, kullanıcıyı sistemin sınırları hakkında bilgilendirir. Risk seviyeleri (low, medium, high) ve izin gereksinimleri belirgin şekilde gösterilir. Hiçbir eylem butonu sunulmaz.

## 9. Review / Approval Skeleton Davranışı
Kullanıcı adımları şu durumlara çekebilir:
- **Pending (Beklemede):** Henüz incelenmemiş.
- **Approved for Future (Gelecek için Onaylı):** Adım mantıklı bulundu, gelecekteki izinli fazlarda uygulanabilir.
- **Rejected (Reddedildi):** Adım uygun bulunmadı.

## 10. Review Summary Davranışı
İnceleme bittiğinde üretilen özet, tüm adımların durumunu ve kullanıcı notlarını içerir. Notlar içerisindeki dosya yolları ve sırlar sanitizer tarafından maskelenmiş olarak gösterilir.

## 11. Test ve Smoke Scriptleri
Sistemin güvenliğini ve mantığını doğrulamak için aşağıdaki scriptler kullanılır:
- `npm run smoke:phase47-workspace-agent-planning-boundary`
- `npm run smoke:phase48-workspace-agent-plan-preview-ui`
- `npm run smoke:phase49-workspace-agent-plan-review-skeleton`
- `npm run smoke:phase50-workspace-agent-review-summary`

## 12. Geliştirici Notları
- `approved_for_future` durumuna çekilen bir adım asla otomatik olarak çalıştırılmamalıdır.
- İnceleme notları her zaman `sanitizePlanReviewNote` fonksiyonundan geçirilmelidir.
- Yeni bir adım tipi eklenirse `planning-policy.ts` güncellenmelidir.

## 13. Sık Yapılan Hatalar
- Plan adımlarına ham terminal komutları koymak.
- İnceleme state'ini `localStorage` veya `sessionStorage` içine kaydetmeye çalışmak.
- Özet çıktısını otomatik olarak Chat inputuna doldurmak.

## 14. Gelecekte Dikkat Edilmesi Gerekenler
- Yazma ve yürütme fazları eklendiğinde, bu plan-only hattının izolasyonu korunmalıdır.
- Sanitizer regex'leri yeni keşfedilen hassas desenlere göre güncel tutulmalıdır.
- UI bildirimleri, kullanıcının "onay" işleminin "yürütme" olmadığını anladığından emin olmalıdır.
---

## İlgili Dokümanlar
- Güvenlik kontrolleri için bkz: [Workspace Agent Plan/Review Safety Checklist](workspace-agent-plan-review-safety-checklist.md)
- Ana ürün mimarisi için bkz: [README.md](../README.md)
