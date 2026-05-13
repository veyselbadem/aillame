# Workspace Agent Execution Readiness Safety Checklist

## 1. Amaç
Bu checklist, Workspace Agent'ın hazır bulunuşluk (readiness) hattının güvenliğini sağlamak, yürütme (execution) ve yetkilendirme (permission grant) sınırlarını korumak amacıyla geliştiriciler için oluşturulmuştur.

Mimari akış için bkz: [Workspace Agent Execution Readiness Flow](workspace-agent-execution-readiness.md) (ActionExecutor ve Command Registry kapalıdır, satisfied=false sınırı korunur).

## 2. Genel Güvenlik İlkeleri
- [ ] Sistem yalnızca readiness değerlendirmesi üretir.
- [ ] Hiçbir execution (yürütme) başlatılmaz.
- [ ] Hiçbir permission grant (yetki) verilmez.
- [ ] Permission requirement `satisfied=false` kalır.
- [ ] Active grant count 0 kalır.
- [ ] ActionExecutor kapalıdır.
- [ ] Command Registry kapalıdır.
- [ ] Shell command (terminal komutu) çalıştırılmaz.
- [ ] File write (dosya yazma) yapılmaz.
- [ ] Chat/Nano prompt injection yapılmaz.

## 3. Readiness-Only Sınırı
- [ ] `requestedMode` değeri `readiness_only` olarak ayarlanmıştır.
- [ ] Readiness dışındaki modlar (non-readiness mode) engellenir (blocked/rejected).
- [ ] Onaylanan adım (approved step) listesi yürütme izni anlamına gelmez.
- [ ] Kullanıcı onay metni (user confirmation text) yetki verme anlamına gelmez.
- [ ] Readiness sonucu yürütülebilir bir payload (executable payload) içermez.
- [ ] Readiness sonucu çalıştırılabilir komut (runnable command) içermez.
- [ ] Readiness sonucu dosya yazma yükü (file write payload) içermez.

## 4. Permission Requirement Güvenliği
- [ ] Permission requirement durumu her zaman `satisfied=false` kalır.
- [ ] İzin incelemesi (permission review) sonucu asla `satisfied=true` yapılmaz.
- [ ] `acknowledged_for_future` durumu yetki verme (grant) anlamına gelmez.
- [ ] Permission nesnesi token veya kimlik bilgisi (credential) içermez.
- [ ] Permission nesnesi komut yükü (command payload) içermez.
- [ ] Permission nesnesi dosya yazma yükü (file write payload) içermez.
- [ ] Permission nesnesi ham dosya yolu (raw path) içermez.

## 5. Preflight Check Güvenliği
- [ ] Preflight kontrolleri hiçbir harici sistemi çağırmaz.
- [ ] Preflight kontrolleri shell runner çağırmaz.
- [ ] Preflight kontrolleri dosya yazma yardımcısı (file write helper) çağırmaz.
- [ ] Preflight kontrolleri ActionExecutor çağırmaz.
- [ ] Preflight kontrolleri Command Registry çağırmaz.
- [ ] Komut benzeri niyetler (command-like intent) uyarı veya engelleme üretir.
- [ ] Dosya yazma benzeri niyetler (file-write-like intent) uyarı veya engelleme üretir.

## 6. UI / Preview Güvenliği
- [ ] Preview UI yalnızca readiness sonuçlarını görselleştirir.
- [ ] Arayüzde Grant, Allow, Run, Execute, Apply veya Write butonu bulunmaz.
- [ ] Arayüzde Save-to-file veya Export-to-file seçenekleri bulunmaz.
- [ ] Permission requirement'lar `satisfied=false` olarak gösterilir.
- [ ] Active grant count 0 olarak gösterilir.
- [ ] `fullPath`, `canonicalPath` veya fiziksel yollar gösterilmez.
- `stdout`, `stderr`, `PID` veya `stack trace` bilgileri gösterilmez.
- Gizli anahtar (secret), token veya şifre gösterilmez.

## 7. Review State Güvenliği
- [ ] Review state yalnızca bellek içi (in-memory) tutulur.
- [ ] İnceleme notları sanitize edilir (temizlenir).
- [ ] Not içindeki yollar ve gizli bilgiler maskelenir (`[REDACTED_PATH]`, `[REDACTED_SECRET]`).
- [ ] Review state hiçbir zaman model payload'una (Nano prompt vb.) gitmez.
- [ ] Review state Nano hafızasına yazılmaz.
- [ ] Review state diske, localStorage'a veya sessionStorage'a yazılmaz.
- [ ] İnceleme durumu asla bir yetki (permission grant) durumuna dönüşmez.

## 8. Review Summary Güvenliği
- [ ] Özet (Summary) kalıcı değildir (non-persistent).
- [ ] Özet dosyaya dışa aktarılmaz (file export yapılmaz).
- [ ] Özet Chat/Nano promptuna otomatik olarak eklenmez.
- [ ] Panoya kopyalama (clipboard copy) yalnızca kullanıcı aksiyonuyla gerçekleşir.
- [ ] Özet metni yetki/yürütme içermediğini (no-grant/no-execution) açıkça belirtir.
- [ ] Özet ham yol, gizli bilgi, komut veya yazma yükü içermez.
- [ ] Özet herhangi bir uygulama (apply), yürütme (run) veya yetki (grant) tetiklemez.

## 9. Execution / Tool Sınırları
- [ ] `ActionExecutor` kütüphanesi import edilmez ve kullanılmaz.
- [ ] `Command Registry` kütüphanesi import edilmez ve kullanılmaz.
- [ ] `Shell runner` kütüphanesi import edilmez ve kullanılmaz.
- [ ] `File write helper` kütüphanesi import edilmez ve kullanılmaz.
- [ ] Runtime, model veya çıkarım döngüsü dosyalarına dokunulmaz.
- [ ] Ağ (network) veya localhost üzerinden fetch işlemleri eklenmez.
- [ ] Harici sağlayıcı (external provider) entegrasyonu yapılmaz.

## 10. Storage / Persistence Güvenliği
- [ ] Readiness sonucu diske yazılmaz.
- [ ] Review state diske yazılmaz.
- [ ] Özet (Summary) diske yazılmaz.
- `localStorage` ve `sessionStorage` kullanılmaz.
- `.aillame-data` klasörü içine yazım yapılmaz.
- Uzun süreli hafızaya (long-term memory) otomatik kayıt yapılmaz.

## 11. Logging Güvenliği
- [ ] Ham readiness isteği loglanmaz.
- [ ] Ham onay metni (confirmation text) loglanmaz.
- [ ] İnceleme notlarının ham hali loglanmaz.
- [ ] Özetin ham hali loglanmaz.
- [ ] `fullPath` veya `canonicalPath` loglanmaz.
- [ ] Gizli bilgiler (secret/token) loglanmaz.
- Ham `stdout/stderr`, `PID` veya `stack trace` raporlanmaz.

## 12. Test ve Regresyon Kontrolleri
- [ ] `npm run smoke:phase56-workspace-agent-execution-readiness-boundary`
- [ ] `npm run smoke:phase57-workspace-agent-execution-readiness-preview-ui`
- [ ] `npm run smoke:phase58-workspace-agent-readiness-review-state`
- [ ] `npm run smoke:phase59-workspace-agent-readiness-review-summary`
- [ ] `npm run smoke:phase63-workspace-agent-execution-readiness-docs`
- [ ] `npm run smoke:phase65-execution-readiness-final-regression` (Uçtan uca final regresyon)
- [ ] `npm run typecheck`
- [ ] `npm run build`

## 13. Kod Review Checklist'i
- [ ] Bu değişiklik `satisfied=true` üretiyor mu?
- [ ] Bu değişiklik active grant count’u 0 dışına çıkarıyor mu?
- [ ] Bu değişiklik Grant/Allow/Run/Execute/Apply/Write butonu ekliyor mu?
- [ ] Bu değişiklik ActionExecutor veya Command Registry açıyor mu?
- [ ] Bu değişiklik file write veya shell execution ekliyor mu?
- [ ] Bu değişiklik review/summary state’i kalıcı storage’a yazıyor mu?
- [ ] Bu değişiklik summary’i Chat/Nano promptuna otomatik ekliyor mu? (Hidden/system prompt injection yasaktır)
- [ ] Bu değişiklik ham yol, gizli bilgi veya komut yükü sızdırıyor mu?
- [ ] Bu değişiklik smoke testlerini güncelliyor mu?
- [ ] Faz 65 final regression smoke güncel ve başarılı mı?

## 14. Yasak Değişiklikler
- Permission requirement’ı `satisfied=true` yapmak yasaktır.
- İnceleme onayı ile gerçek yetki (permission grant) vermek yasaktır.
- Özet dışa aktarımı ile dosya yazma işlemi yapmak yasaktır.
- Özeti gizli prompt (hidden prompt) olarak kullanmak yasaktır.
- ActionExecutor/Command Registry’yi bu hat üzerinden açmak yasaktır.
- Arayüze Grant/Allow/Run/Execute/Apply/Write/Save-to-file butonu eklemek yasaktır.
- Ham terminal komutu veya dosya yazma yükü taşımak yasaktır.
- Ham dosya yolu veya gizli bilgi loglamak yasaktır.

## 15. Gerçek Execution Fazına Geçmeden Önce Kontrol Listesi
- [ ] Tüm readiness modları `readiness_only` olarak mühürlendi mi?
- [ ] UI'da hiçbir "yürütme" ibaresi kalmadı mı?
- [ ] Tüm smoke testleri güvenlik sınırlarını hala doğruluyor mu?
- [ ] Maskeleme (sanitization) algoritmaları güncel mi?
