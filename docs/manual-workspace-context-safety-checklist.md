# Manual Workspace Context Safety Checklist

Mimari akış için bkz: [Manual Workspace Context Flow](manual-workspace-context.md).
Bu checklist geliştirici güvenlik kontrolü içindir; RAG veya otomatik retrieval hattı değildir.

## 1. Amac

Bu checklist, Faz 26-42 arasinda gelistirilen manuel workspace context hattinda guvenlik sinirlarini korumak ve degisikliklerde regresyon riskini azaltmak icin hazirlanmistir.

## 2. Genel Guvenlik Ilkeleri

- [ ] Context yalnizca kullanici manuel eklerse Chat taslagina girer.
- [ ] Context kullanici tarafindan gorunur metin olarak gonderilir.
- [ ] Hidden/system prompt icine workspace icerigi eklenmez.
- [ ] Metadata model payload'a tasinmaz.
- [ ] Nano sadece gorunur user message icerigini kullanir.
- [ ] Search/RAG/tool yetkisi bu hat uzerinden acilmaz.
- [ ] File write veya memory write bu hat uzerinden yapilmaz.

## 3. Prompt / Context Sinirlari

- [ ] Prompt'a otomatik workspace context eklenmedi.
- [ ] Staged context prompta otomatik tasinmadi.
- [ ] Metadata prompta eklenmedi.
- [ ] System prompt icine dosya icerigi eklenmedi.
- [ ] Manual context marker'lari gorunur kaldi.
- [ ] Kullanici gondermeden model cagrisi baslamiyor.

## 4. UI / Draft Guvenligi

- [ ] Attach yalnizca kullanici tiklamasiyla calisiyor.
- [ ] Cleanup yalnizca kullanici tiklamasiyla calisiyor.
- [ ] Boundary awareness kullaniciya acikca gosteriliyor.
- [ ] Bozuk boundary durumunda agresif silme yapilmiyor.
- [ ] Warning mesajlari path/secret gostermiyor.
- [ ] Chat submit otomatik tetiklenmiyor.

## 5. Metadata Guvenligi

- [ ] Metadata UI-only.
- [ ] Metadata raw context icermiyor.
- [ ] Metadata raw user message icermiyor.
- [ ] Metadata fullPath/canonicalPath icermiyor.
- [ ] Metadata model payload'a gitmiyor.
- [ ] Metadata memory'ye yazilmiyor.

## 6. Nano Davranis Guvenligi

- [ ] Nano "dosyayi okudum" demiyor.
- [ ] Nano "workspace'i taradim" demiyor.
- [ ] Nano "RAG sonucuna gore" demiyor.
- [ ] Nano gorunur snippet sinirini belirtiyor.
- [ ] Nano yetersiz context varsa ek bilgi istiyor.
- [ ] Nano celiski varsa kesin hukum vermiyor.
- [ ] Nano profil bazli cevap uzunlugunu guvenli sekilde uyguluyor.

## 7. Reference / Citation Guvenligi

- [ ] Reference yalnizca gorunur etiket.
- [ ] Reference file path gibi cozulmuyor.
- [ ] Nano referansi takip ettigini iddia etmiyor.
- [ ] Citation uzerinden dosya okunmuyor.
- [ ] Reference path/secret pattern icerirse tekrar gosterilmiyor.
- [ ] Citation metadata hidden prompta tasinmiyor.

## 8. Memory / Storage Guvenligi

- [ ] Manual context localStorage'a yazilmiyor.
- [ ] Manual context sessionStorage'a yazilmiyor.
- [ ] Manual context disk'e yazilmiyor.
- [ ] Manual context `.aillame-data` icine yazilmiyor.
- [ ] Manual context Nano memory'ye yazilmiyor.
- [ ] Long-term memory'ye otomatik kayit yok.

## 9. Logging Guvenligi

- [ ] Raw user message loglanmiyor.
- [ ] Raw context block loglanmiyor.
- [ ] Removed context block loglanmiyor.
- [ ] fullPath/canonicalPath loglanmiyor.
- [ ] Secret/token/password loglanmiyor.
- [ ] Raw stdout/stderr, PID, stack trace raporlanmiyor.
- [ ] Safe log helper sadece boolean/code/count donduruyor.

## 10. Test ve Regresyon Kontrolleri

Cekirdek komutlar:

- `npm run smoke:phase41-manual-context-flow-regression`
- `npm run typecheck`
- `npm run build`

Ihtiyac halinde Faz 26-40 smoke scriptleri de calistirilmalidir.

## 11. Kod Review Checklist'i

- [ ] Bu degisiklik context'i otomatik prompta ekliyor mu?
- [ ] Bu degisiklik Nano'ya dosya okuma iddiasi yaptiriyor mu?
- [ ] Bu degisiklik metadata'yi model payload'a tasiyor mu?
- [ ] Bu degisiklik localStorage/sessionStorage/disk yazimi ekliyor mu?
- [ ] Bu degisiklik ActionExecutor veya Command Registry aciyor mu?
- [ ] Bu degisiklik full path veya secret sizdiriyor mu?
- [ ] Bu degisiklik regression smoke testlerini guncelliyor mu?

## 12. Yasak Degisiklikler

- Manual context'i otomatik RAG inputu yapmak yasaktir.
- Metadata'yi hidden prompt olarak kullanmak yasaktir.
- Reference degerini path resolver gibi kullanmak yasaktir.
- Nano'ya workspace tarama/dosya okuma iddiasi yaptirmak yasaktir.
- Staged context'i kalici storage'a yazmak yasaktir.
- ActionExecutor/Command Registry'yi bu hat uzerinden acmak yasaktir.
- Full path, canonical path veya secret loglamak yasaktir.

## 13. Yeni Fazlara Gecmeden Once Kontrol Listesi

- [ ] Faz 41 regresyon smoke suiti calisti ve gecti.
- [ ] typecheck ve build basarili.
- [ ] Manual context sadece gorunur ve kullanici kontrollu akista kaliyor.
- [ ] Prompt/model payload'a hidden context tasinmiyor.
- [ ] Metadata yalnizca UI kullaniminda kaliyor.
- [ ] Dokuman ve loglarda hassas veri bulunmuyor.

## Dokumantasyon Icin Guvenli Ornekler

Ornek verirken sadece guvenli degerler kullan:

- `example.ts`
- `README.md`
- `[REDACTED_SECRET]`
- `[REDACTED_PATH]`
