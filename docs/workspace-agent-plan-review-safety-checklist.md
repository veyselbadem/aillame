# Workspace Agent Plan/Review Safety Checklist

## 1. Amaç
Bu checklist'in amacı, Workspace Agent'ın planlama, önizleme, inceleme ve özetleme aşamalarında (Faz 47-51) belirlenen güvenlik sınırlarının korunmasını sağlamaktır. Bu liste, geliştiriciler için her fazda ve her kod değişikliğinde (PR) kontrol edilmesi gereken kritik güvenlik kriterlerini sunar.

## 2. Genel Güvenlik İlkeleri
- [ ] Sistem yalnızca plan üretir, hiçbir işlemi yürütmez.
- [ ] Plan adımları kullanıcı müdahalesi olsa dahi otomatik olarak uygulanmaz.
- [ ] Tüm plan adımları (steps) `executable=false` kalmak zorundadır.
- [ ] Review onayı (`approved_for_future`), bu fazda bir yürütme (execution) izni anlamına gelmez.
- [ ] Review summary çıktısı diske veya herhangi bir kalıcı depolama birimine yazılmaz.
- [ ] `ActionExecutor` motoru bu hat üzerinde kapalıdır.
- [ ] `Command Registry` erişimi bu hat üzerinde engellenmiştir.
- [ ] Hiçbir shell komutu çalıştırılmaz.
- [ ] Hiçbir dosya yazma (file write) işlemi yapılmaz.
- [ ] Çıktılar Chat/Nano promptuna otomatik olarak enjekte edilmez (injection yasağı).

## 3. Plan-Only Sınırı
- [ ] Plan request içindeki `mode` değeri her zaman `plan_only` olmalıdır.
- [ ] Plan isteği (request) ham komut payload'ı içermemelidir.
- [ ] Plan adımları (steps) shell komutu veya dosya yazma payload'ı taşımamalıdır.
- [ ] Plan adımları ham dosya yolları (`C:\...`, `/etc/...`) içermemelidir.
- [ ] Risk ve uyarı alanları kullanıcıyı korkutmadan teknik sınırları net açıklamalıdır.
- [ ] Dosya düzenleme (`edit`) veya test niyetleri sadece metinsel birer öneri (`proposal`) olarak kalmalıdır.

## 4. UI / Preview Güvenliği
- [ ] Preview UI ekranı sadece metinsel plan içeriğini göstermelidir.
- [ ] Arayüzde "Run", "Execute", "Apply", "Write" gibi yürütme butonları kesinlikle bulunmamalıdır.
- [ ] "Save-to-file" veya "Export-to-file" gibi dosya çıktısı butonları bulunmamalıdır.
- [ ] Adım render datası sadece izin verilmiş (whitelist) güvenli alanlardan oluşmalıdır.
- [ ] `fullPath`, `canonicalPath` veya fiziksel yollar (`physical path`) arayüzde gösterilmemelidir.
- [ ] `stdout`, `stderr`, `PID` veya `stack trace` bilgileri kullanıcıya sunulmamalıdır.
- [ ] Gizli anahtarlar (`secret`), tokenlar veya parolalar (`password`) arayüzde ham halde gösterilmemelidir.

## 5. Review / Approval Güvenliği
- [ ] `approved_for_future` statüsü sadece bir niyet belirtisidir, execution tetikleyicisi olamaz.
- [ ] İnceleme durumu (Review State) sadece uygulama belleğinde (in-memory) yaşamalıdır.
- [ ] Kullanıcı tarafından eklenen inceleme notları her zaman sanitize edilmelidir.
- [ ] Not içindeki olası dosya yolları ve sırlar maskelenmelidir (`[REDACTED_PATH]`, `[REDACTED_SECRET]`).
- [ ] Review state, modelin genel payload'ına veya Nano belleğine otomatik olarak eklenmemelidir.
- [ ] Review state; disk, `localStorage` veya `sessionStorage` gibi birimlere yazılmamalıdır.

## 6. Summary Export Güvenliği
- [ ] Özet çıktısı (Summary) kalıcı değildir (non-persistent).
- [ ] Özet için dosya dışa aktarma (file export) fonksiyonu bulunmamalıdır.
- [ ] Özet içeriği Chat/Nano promptuna otomatik olarak doldurulmamalıdır.
- [ ] Panoya kopyalama (clipboard copy) işlemi sadece kullanıcının açık bir tıklama aksiyonuyla gerçekleşmelidir.
- [ ] Özet metni içerisinde `executable=false` sınırı açıkça belirtilmelidir.
- [ ] Özet; ham yol, sır, komut veya yazma payload'ı içermemelidir.
- [ ] Özet paneli üzerinden hiçbir uygulama, çalıştırma veya kayıt işlemi tetiklenmemelidir.

## 7. Execution / Tool Sınırları
- [ ] `ActionExecutor` import'u veya kullanımı bu faz kapsamındaki dosyalarda bulunmamalıdır.
- [ ] `Command Registry` import'u veya kullanımı bulunmamalıdır.
- [ ] Shell runner (`exec`, `spawn` vb.) yardımıyla komut çalıştırma eklenmemelidir.
- [ ] `fs.writeFile`, `fs.appendFile` gibi dosya yazma helper'ları kullanılmamalıdır.
- [ ] Runtime, model veya altyapı yaşam döngüsü (lifecycle) dosyalarına dokunulmamalıdır.
- [ ] Localhost veya dış ağa yönelik `fetch` istekleri eklenmemelidir.
- [ ] Yeni external provider (Ollama, ComfyUI vb.) entegrasyonu yapılmamalıdır.

## 8. Storage / Persistence Güvenliği
- [ ] Plan durumu diske kaydedilmemelidir.
- [ ] İnceleme durumu diske kaydedilmemelidir.
- [ ] Özet içeriği diske kaydedilmemelidir.
- [ ] `localStorage` veya `sessionStorage` kullanımından kaçınılmalıdır.
- [ ] `.aillame-data` klasörü içine herhangi bir veri yazılmamalıdır.
- [ ] Uzun süreli belleğe (long-term memory) otomatik kayıt yapılmamalıdır.

## 9. Logging Güvenliği
- [ ] Ham kullanıcı hedefi (`user goal`) dış loglara yazılmamalıdır.
- [ ] Plan payload'ı ham haliyle loglanmamalıdır.
- [ ] İnceleme notlarının (review notes) ham hali loglanmamalıdır.
- [ ] Özet çıktısının ham hali loglanmamalıdır.
- [ ] `fullPath` veya `canonicalPath` log kayıtlarında yer almamalıdır.
- [ ] Gizli anahtarlar, tokenlar ve parolalar loglanmamalıdır.
- [ ] `stdout`, `stderr`, `PID` veya `stack trace` hata raporlarına sızdırılmamalıdır.

## 10. Test ve Regresyon Kontrolleri
Her değişiklikten sonra aşağıdaki testlerin başarılı olması zorunludur:
- `npm run smoke:phase47-workspace-agent-planning-boundary`
- `npm run smoke:phase48-workspace-agent-plan-preview-ui`
- `npm run smoke:phase49-workspace-agent-plan-review-skeleton`
- `npm run smoke:phase50-workspace-agent-review-summary`
- `npm run typecheck`
- `npm run build`

## 11. Kod Review Checklist'i
Bir PR incelenirken aşağıdaki sorulara "HAYIR" cevabı verilmelidir:
- [ ] Bu değişiklik herhangi bir plan adımını `executable=true` yapıyor mu?
- [ ] Bu değişiklik arayüze "Run", "Execute", "Apply" veya "Write" butonu ekliyor mu?
- [ ] Bu değişiklik `ActionExecutor` veya `Command Registry` yetkilerini açıyor mu?
- [ ] Bu değişiklik bir dosya yazma veya shell komutu yürütme mantığı içeriyor mu?
- [ ] Bu değişiklik inceleme durumunu kalıcı bir depolama birimine yazıyor mu?
- [ ] Bu değişiklik özeti Chat/Nano promptuna otomatik olarak enjekte ediyor mu?
- [ ] Bu değişiklik ham dosya yolu, gizli anahtar veya komut payload'ı sızdırıyor mu?
- [ ] Bu değişiklik mevcut smoke testlerini devre dışı bırakıyor mu veya kapsamını daraltıyor mu?

## 12. Yasak Değişiklikler
- Plan adımlarını `executable` yapmak kesinlikle yasaktır.
- İnceleme onayı ile otomatik yürütme (execution) başlatmak yasaktır.
- Özet çıktısını bir dosyaya kaydetmek veya yazdırmak yasaktır.
- Özet çıktısını "hidden prompt" veya "system prompt" parçası olarak modele göndermek yasaktır.
- `ActionExecutor` veya `Command Registry` erişimini bu akış üzerinden etkinleştirmek yasaktır.
- UI'ya eylem tetikleyici (Run/Execute/Write vb.) butonlar eklemek yasaktır.
- Ham shell komutu veya dosya yazma payload'ı taşımak yasaktır.
- Ham dosya yollarını (`fullPath`), sırları (`secret`) veya hata çıktılarını loglamak/göstermek yasaktır.

## 13. Yeni Execution Fazına Geçmeden Önce Kontrol Listesi
Bu hat üzerinden gerçek yürütme (execution) fazlarına geçilmeden önce:
- [ ] Plan-only izolasyonunun bozulmadığından emin olunmalıdır.
- [ ] Güvenlik politikaları (`planning-policy.ts`) tekrar gözden geçirilmelidir.
- [ ] İnceleme ve onay sürecinin bir yürütme emri değil, sadece niyet doğrulaması olduğu onaylanmalıdır.
---

## İlgili Dokümanlar
- Mimari akış özeti için bkz: [Workspace Agent Plan/Review Flow](workspace-agent-plan-review.md)
- Ana ürün mimarisi için bkz: [README.md](../README.md)
