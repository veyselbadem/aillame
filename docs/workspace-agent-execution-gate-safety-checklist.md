# Workspace Agent Execution Gate Safety Checklist

## 1. Amaç
Bu checklist, Workspace Agent Execution Gate hattının (Faz 69-73) güvenlik sınırlarını korumak, yürütme (execution) yetkisi sızıntılarını önlemek ve geliştiricilerin bu hat üzerinde yapacağı değişiklikleri denetlemek için oluşturulmuştur.

---

> [!NOTE]
> Mimari akış ve detaylı dokümantasyon için bkz: [Workspace Agent Execution Gate Flow](./workspace-agent-execution-gate.md)

## 2. Genel Güvenlik İlkeleri
- [ ] Sistem yalnızca gate değerlendirmesi üretir.
- [ ] Hiçbir execution başlatılmaz.
- [ ] Hiçbir permission grant verilmez.
- [ ] Hiçbir capability/token üretilmez.
- [ ] `canExecute=false` kalır.
- [ ] `canWrite=false` kalır.
- [ ] `canRunShell=false` kalır.
- [ ] `issuedCapability=null` kalır.
- [ ] active capability count 0 kalır.
- [ ] ActionExecutor kapalıdır.
- [ ] Command Registry kapalıdır.
- [ ] Shell command çalıştırılmaz.
- [ ] File write yapılmaz.
- [ ] Chat/Nano prompt injection yapılmaz.

## 3. Gate-only Sınırı
- [ ] `requestedMode` değeri `gate_check_only`.
- [ ] Non-gate mode blocked/rejected davranıyor.
- [ ] Approved step listesi allow anlamına gelmiyor.
- [ ] User confirmation text allow/grant anlamına gelmiyor.
- [ ] Gate result executable payload içermiyor.
- [ ] Gate result runnable command içermiyor.
- [ ] Gate result file write payload içermiyor.
- [ ] Gate result capability payload içermiyor.

## 4. Gate Decision Güvenliği
- [ ] Decision allowed/granted olamaz.
- [ ] Decision yalnızca blocked / requires_more_review / not_supported değerleriyle sınırlı.
- [ ] `canExecute` true yapılmıyor.
- [ ] `canWrite` true yapılmıyor.
- [ ] `canRunShell` true yapılmıyor.
- [ ] `issuedCapability` null dışına çıkarılmıyor.
- [ ] Decision safeMessage raw path/secret içermiyor.

## 5. Gate Check Güvenliği
- [ ] Gate check hiçbir sistemi çağırmıyor.
- [ ] Gate check shell runner çağırmıyor.
- [ ] Gate check file write helper çağırmıyor.
- [ ] Gate check ActionExecutor çağırmıyor.
- [ ] Gate check Command Registry çağırmıyor.
- [ ] Command-like intent warning/blocked üretiyor.
- [ ] File-write-like intent warning/blocked üretiyor.
- [ ] Capability-like intent blocked kalıyor.

## 6. UI / Preview Güvenliği
- [ ] Preview UI yalnızca gate sonucu gösteriyor.
- [ ] UI’da Grant / Allow / Run / Execute / Apply / Write butonu yok.
- [ ] UI’da Issue Capability butonu yok.
- [ ] UI’da Save-to-file veya Export-to-file yok.
- [ ] `canExecute=false` olarak gösteriliyor.
- [ ] `canWrite=false` olarak gösteriliyor.
- [ ] `canRunShell=false` olarak gösteriliyor.
- [ ] `issuedCapability=null` olarak gösteriliyor.
- [ ] active capability count 0 olarak gösteriliyor.
- [ ] fullPath/canonicalPath/physical path gösterilmiyor.
- [ ] stdout/stderr/PID/stack trace gösterilmiyor.
- [ ] Secret/token/password gösterilmiyor.

## 7. Review State Güvenliği
- [ ] Review state yalnızca in-memory.
- [ ] Review note sanitize ediliyor.
- [ ] Note içindeki path/secret maskeleniyor.
- [ ] Review state model payload’a gitmiyor.
- [ ] Review state Nano memory’ye yazılmıyor.
- [ ] Review state disk/localStorage/sessionStorage’a yazılmıyor.
- [ ] Review status permission grant’e dönüşmüyor.
- [ ] Review status capability grant’e dönüşmüyor.

## 8. Review Summary Güvenliği
- [ ] Summary non-persistent.
- [ ] Summary file export yapmıyor.
- [ ] Summary Chat/Nano promptuna otomatik eklenmiyor.
- [ ] Summary clipboard copy yalnızca kullanıcı aksiyonuyla oluyor.
- [ ] Summary no-capability/no-execution sınırını açıkça belirtiyor.
- [ ] Summary raw path/secret/command/write payload içermiyor.
- [ ] Summary capability token içermiyor.
- [ ] Summary save/apply/run/execute/grant/allow/issue-capability tetiklemiyor.

## 9. Capability / Grant Sınırları
- [ ] Permission grant yok.
- [ ] Capability/token yok.
- [ ] `issuedCapability` null.
- [ ] active capability count 0.
- [ ] `acknowledged` grant anlamına gelmiyor.
- [ ] Summary capability belgesi değildir.
- [ ] Clipboard copy capability handoff değildir.

## 10. Execution / Tool Sınırları
- [ ] ActionExecutor import/kullanımı yok.
- [ ] Command Registry import/kullanımı yok.
- [ ] Shell runner import/kullanımı yok.
- [ ] File write helper import/kullanımı yok.
- [ ] Runtime/model lifecycle dosyalarına dokunulmuyor.
- [ ] Network/localhost fetch eklenmiyor.
- [ ] External provider entegrasyonu yapılmıyor.

## 11. Storage / Persistence Güvenliği
- [ ] Gate result disk’e yazılmıyor.
- [ ] Review state disk’e yazılmıyor.
- [ ] Summary disk’e yazılmıyor.
- [ ] localStorage kullanılmıyor.
- [ ] sessionStorage kullanılmıyor.
- [ ] `.aillame-data` içine yazım yok.
- [ ] Long-term memory’ye otomatik kayıt yok.

## 12. Logging Güvenliği
- [ ] Raw gate request loglanmıyor.
- [ ] Raw confirmation text loglanmıyor.
- [ ] Review note raw hali loglanmıyor.
- [ ] Summary raw hali loglanmıyor.
- [ ] fullPath/canonicalPath loglanmıyor.
- [ ] Secret/token/password loglanmıyor.
- [ ] Raw stdout/stderr, PID, stack trace raporlanmıyor.

## 13. Test ve Regresyon Kontrolleri
- `npm run smoke:phase69-workspace-agent-execution-gate-contract`
- `npm run smoke:phase70-workspace-agent-execution-gate-preview-ui`
- `npm run smoke:phase71-workspace-agent-gate-review-state`
- `npm run smoke:phase72-workspace-agent-gate-review-summary`
- `npm run smoke:phase78-execution-gate-final-regression`
- `npm run typecheck`
- `npm run build`

## 14. Kod Review Checklist'i
- [ ] Bu değişiklik decision allowed/granted üretiyor mu?
- [ ] Bu değişiklik `canExecute=true` üretiyor mu?
- [ ] Bu değişiklik `canWrite=true` üretiyor mu?
- [ ] Bu değişiklik `canRunShell=true` üretiyor mu?
- [ ] Bu değişiklik `issuedCapability` değerini null dışına çıkarıyor mu?
- [ ] Bu değişiklik Grant/Allow/Run/Execute/Apply/Write/Issue Capability butonu ekliyor mu?
- [ ] Bu değişiklik ActionExecutor veya Command Registry açıyor mu?
- [ ] Bu değişiklik file write veya shell execution ekliyor mu?
- [ ] Bu değişiklik review/summary state’i kalıcı storage’a yazıyor mu?
- [ ] Bu değişiklik summary’i Chat/Nano promptuna otomatik ekliyor mu?
- [ ] Bu değişiklik raw path, secret veya command payload sızdırıyor mu?
- [ ] Bu değişiklik smoke testlerini güncelliyor mu?
- [ ] Faz 78 final regression smoke güncel ve başarılı mı?

## 15. Yasak Değişiklikler
- Decision allowed/granted yapmak yasaktır.
- `canExecute`, `canWrite`, `canRunShell` değerlerini true yapmak yasaktır.
- `issuedCapability` üretmek yasaktır.
- Review approval ile permission grant veya capability vermek yasaktır.
- Summary export ile file write yapmak yasaktır.
- Summary’i hidden prompt olarak kullanmak yasaktır.
- ActionExecutor/Command Registry’yi bu hat üzerinden açmak yasaktır.
- UI’ya Grant/Allow/Run/Execute/Apply/Write/Save-to-file/Issue Capability butonu eklemek yasaktır.
- Raw shell command veya file write payload taşımak yasaktır.
- Full path, canonical path veya secret loglamak yasaktır.

## 16. Gerçek Execution Fazına Geçmeden Önce Kontrol Listesi
- [ ] Yetkilendirme (Granting) motoru ayrı bir güvenlik izolasyon katmanında tasarlanmış mı?
- [ ] `ActionExecutor` için kum havuzu (sandbox) hazır mı?
- [ ] Dosya yazma (file write) için diff-preview ve rollback mekanizması var mı?
- [ ] Shell komutları için allowlist ve timeout tanımlanmış mı?
- [ ] Tüm işlemler için kalıcı ve silinemez bir audit log (denetim kaydı) sistemi kurulu mu?
