# Workspace Agent Execution Readiness Flow

## 1. Amaç
Bu doküman, Workspace Agent'ın planlama aşamasından yürütme (execution) aşamasına geçişi öncesinde gerekli olan hazır bulunuşluk (readiness) değerlendirme hattını açıklar. Bu sistem, yürütme öncesi risklerin analizi, izin gereksinimlerinin belirlenmesi ve kullanıcı onay iskeletinin oluşturulması için güvenli bir katman sağlar.

Güvenlik kontrolleri için ayrıca bkz: [Workspace Agent Execution Readiness Safety Checklist](workspace-agent-execution-readiness-safety-checklist.md) (Bu hat readiness-only'dır, permission grant ve execution yoktur).

## 2. Bu sistem ne değildir?
- **Execution Sistemi Değildir:** Hiçbir kod veya komut çalıştırılmaz.
- **Permission Grant Sistemi Değildir:** Gerçek bir yetki veya izin (token/credential) vermez.
- **File Write Sistemi Değildir:** Dosya sisteminde herhangi bir değişiklik yapmaz.
- **Shell Runner Değildir:** Terminal üzerinde komut yürütmez.
- **ActionExecutor Değildir:** Eylem motorlarını tetiklemez.
- **Command Registry Değildir:** Komut kayıt sistemine erişmez.
- **RAG Sistemi Değildir:** Otomatik bilgi geri çağırma yapmaz.
- **Prompt Injection Sistemi Değildir:** Chat/Nano promptlarına veri enjekte etmez.
- **Persistence Sistemi Değildir:** Verileri diske veya kalıcı depolama birimlerine kaydetmez.

## 3. Fazlara Göre Mimari Özet
- **Faz 56:** Execution readiness boundary / no execution (Temel sınırlar ve kontratlar).
- **Faz 57:** Readiness preview UI / no execution (Hazır bulunuşluk önizleme arayüzü).
- **Faz 58:** Readiness review state / no permission grant (Bellek içi inceleme durumu).
- **Faz 59:** Readiness review summary / no grant export (Güvenli özet ve pano kopyalama).
- **Faz 65:** Execution readiness final regression suite (Uçtan uca güvenlik ve bütünlük testi).

## 4. Uçtan Uca Akış
1. **Readiness Request:** Kullanıcı veya sistem tarafından tetiklenen değerlendirme isteği.
2. **evaluateWorkspaceAgentExecutionReadiness:** İstek analiz edilir, riskler ve izinler belirlenir.
3. **Readiness Result:** Analiz sonucu (executable=false, satisfied=false).
4. **Readiness Preview UI:** Sonuçların Admin panelinde görselleştirilmesi.
5. **Review State:** Kullanıcının izinleri ve kontrolleri in-memory (bellek içi) incelemesi.
6. **Readiness Review Summary:** İnceleme sonucunun güvenli özeti.
7. **Manual Clipboard Copy:** Özeti kopyalayıp manuel kullanım (Opsiyonel).

**Önemli Not:** Hiçbir adım execute edilmez, permission review gerçek izin vermez ve özet hiçbir grant (yetki) üretmez.

## 5. Güvenlik Sınırları
- `requestedMode` yalnızca `readiness_only` olabilir.
- Permission requirement'lar her zaman `satisfied=false` kalır.
- `acknowledged_for_future` durumu gerçek bir permission grant (yetki) değildir.
- `Active grant count` her zaman 0 (sıfır) kalır.
- `ActionExecutor` ve `Command Registry` motorları bu hat üzerinde kapalıdır.
- Shell komutları çalıştırılmaz ve dosya yazma işlemi yapılmaz.
- Review state yalnızca in-memory UI state'tir; diske yazılmaz.
- Özet (Summary) non-persistent'tır; Chat/Nano promptuna otomatik eklenmez.
- `fullPath`, `secret`, `stdout`, `PID` gibi hassas teknik veriler taşınmaz.
- Arayüzde Run/Execute/Apply/Write/Grant gibi aksiyon butonları bulunmaz.

## 6. Önemli Dosyalar ve Sorumlulukları

### Execution Readiness Çekirdeği:
- `readiness-types.ts`: Veri kontratları ve tip tanımları.
- `readiness-policy.ts`: Güvenlik politikaları ve sabitleri.
- `readiness-sanitizer.ts`: Girdi temizleme ve niyet sezme mantığı.
- `readiness-boundary.ts`: Ana değerlendirme fonksiyonu.
- `readiness-preview-presenter.ts`: UI için güvenli veri eşleştirici.
- `readiness-review-types.ts`: İnceleme durumu tipleri.
- `readiness-review-state.ts`: İnceleme state yönetimi.
- `readiness-review-summary-types.ts`: Özet veri yapıları.
- `readiness-review-summary.ts`: Özet metin oluşturucu (Builder).

### Hooks:
- `useWorkspaceAgentExecutionReadinessPreview.ts`: Giriş ve analiz yönetimi.
- `useWorkspaceAgentReadinessReview.ts`: İnceleme akışı yönetimi.

### UI Bileşenleri:
- `WorkspaceAgentExecutionReadinessPreview.tsx`: Ana panel.
- `WorkspaceAgentReadinessPreflightList.tsx`: Ön kontrol listesi.
- `WorkspaceAgentPermissionRequirementList.tsx`: İzin gereksinimleri.
- `WorkspaceAgentReadinessWarnings.tsx`: Risk ve uyarı paneli.
- `WorkspaceAgentReadinessReviewSummaryPanel.tsx`: Özet ve kopyalama paneli.
- `app/admin/workspace-agent-readiness/page.tsx`: Admin yönetim sayfası.

## 7. Readiness-Only Contract
Tüm iletişim `readiness_only` modu üzerinden döner. Bu modun dışındaki herhangi bir istek `blocked` durumuna düşer. Sonuç nesnesi yürütülebilir hiçbir payload (komut veya dosya içeriği) içermez.

## 8. Permission Requirement Davranışı
Sistem, gelecekteki bir yürütme için hangi izinlerin (dosya yazma, terminal erişimi vb.) gerekeceğini listeler. Bu aşamada tüm izinler karşılanmamış (`satisfied=false`) olarak işaretlenir.

## 9. Preflight Check Davranışı
Yürütme öncesi motorların (engine) durumunu kontrol eder. Hazır bulunuşluk aşamasında tüm motorlar "fiziksel olarak bağlantısız" (disconnected) olarak raporlanır.

## 10. Preview UI Davranışı
Tailwind tabanlı, zengin görselli bir Admin sayfasıdır. Kullanıcının plan adımlarını ve risklerini görsel olarak görmesini sağlar. Hiçbir yürütme butonu içermez.

## 11. Review State Davranışı
Kullanıcının kalemleri tek tek inceleyebilmesi için bellekte tutulan bir durumdur. Sayfa yenilendiğinde veya analiz tekrarlandığında sıfırlanır.

## 12. Review Summary Davranışı
İnceleme bittiğinde üretilen metin tabanlı rapordur. "Active Grant: 0" vurgusunu her zaman korur ve pano kopyalaması sırasında güvenlik uyarılarını metne ekler.

## 13. Test ve Smoke Scriptleri
- `npm run smoke:phase56-workspace-agent-execution-readiness-boundary`
- `npm run smoke:phase57-workspace-agent-execution-readiness-preview-ui`
- `npm run smoke:phase58-workspace-agent-readiness-review-state`
- `npm run smoke:phase59-workspace-agent-readiness-review-summary`
- `npm run smoke:phase63-workspace-agent-execution-readiness-docs`
- `npm run smoke:phase65-execution-readiness-final-regression` (Final Regresyon Testi)
- `npm run typecheck`
- `npm run build`

Faz 65 regresyonu; boundary, permission, presenter, review state, summary ve dokümantasyon hatlarını tek seferde doğrular ve yasaklı ifade sızıntısı kontrolü yapar.

## 14. Geliştirici Notları
- `acknowledged_for_future` işaretlemesi kod tarafında bir yetki kontrolü olarak kullanılmamalıdır.
- Yeni preflight kontrolleri eklenirken motorlara gerçek bağlantı kurulmamalıdır.
- UI bileşenlerinde "Grant" veya "Allow" kelimeleri yerine "İncelendi" veya "Gelecek İçin Onaylandı" tercih edilmelidir.

## 15. Sık Yapılan Hatalar
- Readiness summary'nin otomatik olarak Chat inputuna yazılması.
- İnceleme notlarında maskelenmemiş gerçek dosya yollarının kullanılması.
- UI'da yanlışlıkla `executable=true` sızdırılması.

## 16. Gelecekte Dikkat Edilmesi Gerekenler
- Gerçek yürütme (execution) fazına geçildiğinde, bu hazır bulunuşluk hattı sadece bir "pre-flight" (uçuş öncesi) kontrolü olarak kalmalı, asla yetkilendirme katmanının yerine geçmemelidir.
- Dosya yazma izinleri her zaman atomik ve diff-preview tabanlı tasarlanmalıdır.
