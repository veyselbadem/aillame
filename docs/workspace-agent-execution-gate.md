# Workspace Agent Execution Gate Flow

## 1. Amaç
Workspace Agent Execution Gate, gelecekteki gerçek yürütme (execution) isteklerini değerlendirmek, riskleri sezmek ve kullanıcı incelemesine sunmak için tasarlanmış bir güvenlik bariyeridir. Bu sistem, "Hazır Bulunuşluk" (Readiness) hattı ile "Gerçek Yürütme" (Execution) fazı arasındaki kritik denetim noktasıdır.

## 2. Bu Sistem Ne Değildir?
Bu sistemin sınırlarını anlamak, güvenlik mimarisini korumak için kritiktir:
- **Execution sistemi değildir:** Hiçbir komut çalıştırmaz.
- **Permission grant sistemi değildir:** Yetki (grant) vermez.
- **Capability issuer değildir:** Capability token/yetki anahtarı üretmez.
- **File write sistemi değildir:** Dosya yazmaz veya düzenlemez.
- **Shell runner değildir:** Terminal erişimi sağlamaz.
- **ActionExecutor/Command Registry değildir:** Yürütme motorlarını etkinleştirmez.
- **RAG sistemi değildir:** Bilgi geri çağırma yapmaz.
- **Chat/Nano prompt injection sistemi değildir:** Modellerin promptuna otomatik veri enjekte etmez.
- **Persistence sistemi değildir:** Veri kalıcılığı sağlamaz.

## 3. Fazlara Göre Mimari Özet
- **Faz 69:** Execution Gate kontratı ve temel iskeleti (types, policy, sanitizer, boundary).
- **Faz 70:** Execution Gate Preview UI (Admin panel görselleştirmesi).
- **Faz 71:** Execution Gate Review State (Bellek içi inceleme yönetimi).
- **Faz 72:** Execution Gate Review Summary (Güvenli özet ve çıktı üretimi).

---

> [!TIP]
> Güvenlik kontrolleri ve geliştirici checklist'i için ayrıca bkz: [Workspace Agent Execution Gate Safety Checklist](./workspace-agent-execution-gate-safety-checklist.md)

## 4. Uçtan Uca Akış
1. **Gate Request:** Yürütme isteği (`gate_check_only` modunda) gate katmanına gelir.
2. **evaluateWorkspaceAgentExecutionGate:** İstek kontrat seviyesinde incelenir.
3. **Gate Result:** Riskler, uyarılar ve kontroller (checks) üretilir.
4. **Gate Preview UI:** Sonuçlar Admin panelinde görselleştirilir.
5. **Gate Review State:** Kullanıcı arayüz üzerinden sonuçları gözden geçirir (acknowledged, rejected vb.).
6. **Gate Review Summary:** İnceleme sonucunun güvenli bir özeti oluşturulur.
7. **Manual Clipboard Copy:** Kullanıcı dilerse özeti manuel olarak kopyalar.

**NOT:** Hiçbir adım otomatik olarak yürütme başlatmaz veya yetki vermez. `canExecute`, `canWrite` ve `canRunShell` her zaman `false` kalır.

## 5. Güvenlik Sınırları
- `requestedMode` yalnızca `gate_check_only` olabilir.
- Kararlar (decision) asla `allowed` veya `granted` olamaz.
- `canExecute`, `canWrite`, `canRunShell` değerleri her zaman `false` kalır.
- `issuedCapability` her zaman `null` kalır.
- `activeCapabilityCount` her zaman `0` kalır.
- `acknowledged` işareti sadece kullanıcı inceleme niyetidir; gerçek bir yetki veya capability değildir.
- `ActionExecutor` ve `Command Registry` kapalıdır.
- İnceleme durumu (`review state`) yalnızca bellek içi (`in-memory`) bir UI durumudur.
- Özet çıktısı kalıcı değildir (`non-persistent`) ve modele otomatik gönderilmez.
- Hassas bilgiler (raw path, secret, stdout, stack trace vb.) maskelenir.
- Arayüzde yürütme veya yetki verme butonları bulunmaz.

## 6. Önemli Dosyalar ve Sorumlulukları

### Execution Gate (Çekirdek):
- `gate-types.ts`: Veri kontratları ve tip tanımları.
- `gate-policy.ts`: Güvenlik politikaları ve sabitleri.
- `gate-sanitizer.ts`: Dosya yolu ve sır maskeleme, niyet sezme.
- `gate-boundary.ts`: Merkezi değerlendirme fonksiyonu.
- `gate-preview-presenter.ts`: UI için güvenli veri eşleştirici.
- `gate-review-types.ts`: İnceleme durumu tipleri.
- `gate-review-state.ts`: İnceleme durumu yardımcıları.
- `gate-review-summary-types.ts`: Özet veri tipleri.
- `gate-review-summary.ts`: Özet üretici ve metin oluşturucu.

### Hooks:
- `useWorkspaceAgentExecutionGatePreview.ts`: Parametre yönetimi ve değerlendirme tetikleyici.
- `useWorkspaceAgentGateReview.ts`: İnceleme durumu yönetimi.

### UI Bileşenleri:
- `WorkspaceAgentExecutionGatePreview.tsx`: Ana önizleme paneli.
- `WorkspaceAgentGateSubComponents.tsx`: Karar kartı, kontrol listesi ve uyarılar.
- `WorkspaceAgentGateReviewSummaryPanel.tsx`: Özet çıktısı ve kopyalama paneli.
- `app/admin/workspace-agent-gate/page.tsx`: Admin yönetim sayfası.

## 7. Gate-only Contract
Sistem, sadece `gate_check_only` modunda çalışır. Gelen talepler hiçbir yürütülebilir komut veya dosya içeriği taşımaz. Çıktılar ise sadece risk analizi ve inceleme statüsü bilgisini barındırır.

## 8. Gate Decision Davranışı
Kararlar sadece `blocked`, `requires_more_review` veya `not_supported` olabilir. Mevcut fazda varsayılan karar, gerçek yetki mekanizması henüz tanımlanmadığı için her zaman `blocked` tarafındadır.

## 9. Gate Check Davranışı
Kontroller; hazır bulunuşluk durumu, motor erişilebilirliği ve yetki varlığı gibi kriterleri denetler. Yetki bulunmadığı sürece bu kontrollerden `blocked` sonucu döner.

## 10. Preview UI Davranışı
Arayüz, geliştiricilerin ve kullanıcıların gate parametrelerini test etmesine olanak tanır. Riskler kırmızı/turuncu renk kodlarıyla, kontroller ise geçiş/engel durumlarıyla görselleştirilir.

## 11. Review State Davranışı
Kullanıcı incelemesi tamamen bellek içindedir. "İncelendi" (acknowledged) olarak işaretlenen bir öğe, sisteme herhangi bir yetki tanımlamaz; sadece kullanıcının o riski gördüğünü tescil eder.

## 12. Review Summary Davranışı
İnceleme bittiğinde üretilen özet, metin tabanlı bir rapordur. Bu rapor, sistemin yürütülemez doğasını ve hiçbir capability üretmediğini kalın harflerle belirtir.

## 13. Test ve Smoke Scriptleri
Sistemin güvenliği ve bütünlüğü aşağıdaki smoke scriptleri ile otomatik olarak doğrulanır:

- `npm run smoke:phase69-workspace-agent-execution-gate-contract`: Kontrat yapısını ve temel mod kısıtlamalarını denetler.
- `npm run smoke:phase70-workspace-agent-execution-gate-preview-ui`: Preview UI veri eşleşmesini ve buton kısıtlamalarını denetler.
- `npm run smoke:phase71-workspace-agent-gate-review-state`: Bellek içi inceleme statüsü geçişlerini doğrular.
- `npm run smoke:phase72-workspace-agent-gate-review-summary`: Özet çıktısının güvenliğini ve içeriğini doğrular.
- `npm run smoke:phase76-workspace-agent-execution-gate-docs`: Dokümantasyon bütünlüğünü ve link doğruluğunu denetler.
- `npm run smoke:phase78-execution-gate-final-regression`: **Final Regresyon Paketi.** Uçtan uca tüm hattı (Boundary, Safety, UI, State, Summary, Leak Checks) doğrular.
- `npm run typecheck`
- `npm run build`

## 14. Geliştirici Notları
- **Maskeleme:** Kullanıcı notları ve özetler her zaman `sanitizeGateReviewNote` üzerinden geçirilmelidir.
- **İzolasyon:** Gate bileşenleri asla `ActionExecutor` kütüphanesini import etmemelidir.
- **UX Tutarlılığı:** Arayüze "Grant" veya "Allow" kelimesini içeren butonlar eklenmemelidir.

## 15. Sık Yapılan Hatalar
- `acknowledged` durumunu gerçek bir izin (permission grant) olarak varsaymak.
- `canExecute` değerini UI'da veya kodda `true` olarak değiştirmeye çalışmak.
- Özet çıktısını modele (Nano/Gemma) otomatik enjekte etmek.
- Hassas yolları (path) maskelemeden özete dahil etmek.

## 16. Gelecekte Dikkat Edilmesi Gerekenler
- Gerçek yürütme fazına geçildiğinde, bu gate katmanı "İzin Verme" (Granting) katmanına girdi (input) sağlayacaktır. Ancak bu geçiş, ayrı bir güvenlik fazı ve izolasyon katmanı gerektirir.
- `issuedCapability` alanı, ancak gerçek bir yetkilendirme motoru (Capability Issuer) tanımlandığında `null` dışına çıkabilir.
