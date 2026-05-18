# Manual Workspace Context Flow

Güvenlik kontrolleri için ayrıca bkz: [Manual Workspace Context Safety Checklist](manual-workspace-context-safety-checklist.md).
Bu akış bir RAG hattı değildir ve Nano yalnızca kullanıcının görünür mesajındaki context'i kullanır.

## 1. Amac

Bu dokuman, Faz 26-41 arasinda gelistirilen manuel workspace context akisinin mimarisini, guvenlik sinirlarini ve dogrulama adimlarini gelistirici perspektifinden aciklar.

Odak:
- Manuel context'in nasil olusturuldugu ve Chat mesaji icine nasil gorunur sekilde eklendigi
- Model tarafina sadece kullanicinin gorunur metninin nasil tasindigi
- Guvenlik regresyonlarinin hangi smoke testlerle yakalandigi

## 2. Bu Sistem Ne Degildir?

Bu akis:
- Bir RAG sistemi degildir.
- Otomatik workspace retrieval degildir.
- Nano tool calling degildir.
- Dosya okuma yetkisi degildir.
- Memory sistemi degildir.
- Hidden context injection degildir.
- Citation resolver degildir.

## 3. Fazlara Gore Mimari Ozet

- Faz 26: Staged context katmani eklendi.
- Faz 27: Staged context, sadece manuel tetikle gorunur Chat taslagina eklenebilir hale geldi.
- Faz 28: Manual context boundary marker'lari ve farkindalik katmani eklendi.
- Faz 29: Chat submit asamasinda mesaj audit katmani eklendi.
- Faz 30: Chat history icin UI-only metadata etiketi eklendi.
- Faz 31: Taslaktaki manual context blogunu guvenli sekilde kaldirma eklendi.
- Faz 32: UX polish ve warning normalize etme tamamlandi.
- Faz 33: Nano, sadece gorunur manuel context'i yorumlar hale getirildi.
- Faz 34: Grounded response style eklendi.
- Faz 35: Gorunur reference style eklendi.
- Faz 36: Yetersiz context handling eklendi.
- Faz 37: Conflict handling eklendi.
- Faz 38: Answer structure katmani eklendi.
- Faz 39: Profile-aware cevap uzunlugu/yoğunlugu eklendi.
- Faz 40: Policy guard ile zincir konsolide edildi.
- Faz 41: Faz 26-40 icin regression smoke suite eklendi.

## 4. Uctan Uca Akis

Metinsel akis:

Workspace Search Result
-> Staged Context
-> Manual Attach
-> Visible Chat Draft Block
-> Boundary Detection
-> Message Audit
-> User Sends Visible Message
-> UI-only Metadata Label
-> Nano sees only visible user message
-> Nano policy guard applies safe behavior

Net kurallar:
- Bu akista otomatik RAG yoktur.
- Nano workspace dosyalarini otomatik okumaz.
- Manual context, kullanicinin Chat taslaginda gorup gonderdigi gorunur metindir.

## 5. Guvenlik Sinirlari

- Context otomatik eklenmez.
- Kullanici manuel ekleme yapmadan Chat'e gitmez.
- Kullanici gondermeden model cagrisi baslamaz.
- Hidden/system prompt icine workspace icerigi eklenmez.
- Metadata model payload'ina gonderilmez.
- Nano memory'ye yazilmaz.
- Disk'e yazilmaz.
- localStorage/sessionStorage kullanilmaz.
- `.aillame-data` altina bu akis icin yazim yapilmaz.
- ActionExecutor/Command Registry acilmaz.
- Search/RAG/tool bu hattan tetiklenmez.
- Reference/citation satirlari sadece gorunur etiket olarak ele alinir.

## 6. Onemli Dosyalar ve Sorumluluklari

### Indexing / Staged Context

- `src/core/indexing/staged-context-types.ts`: staged state limitleri ve tipler
- `src/core/indexing/staged-context-sanitizer.ts`: staged item sanitization/masking
- `src/core/indexing/staged-context-state.ts`: add/remove/dedup/limit state islemleri
- `src/core/indexing/manual-context-attach.ts`: staged item -> gorunur manual context block
- `src/core/indexing/manual-context-boundary.ts`: marker/boundary tespit katmani

### Chat

- `src/core/chat/message-audit.ts`: submit oncesi gorunur mesaj audit
- `src/core/chat/message-metadata.ts`: UI-only metadata olusturma
- `src/core/chat/manual-context-cleanup.ts`: draft'tan manual context blogunu guvenli temizleme
- `src/core/chat/manual-context-ux-state.ts`: UX state yonetimi
- `src/core/chat/manual-context-warning-copy.ts`: warning metinleri

### Nano

- `src/core/nano/visible-context-policy.ts`: gorunur context boundary davranisi
- `src/core/nano/grounded-response-style.ts`: grounded style ve anti-claim guard
- `src/core/nano/visible-reference-policy.ts`: gorunur reference/citation sinirlari
- `src/core/nano/insufficient-context-policy.ts`: yetersiz context handling
- `src/core/nano/manual-context-conflict-policy.ts`: conflict handling
- `src/core/nano/manual-context-answer-structure.ts`: cevap yapisi
- `src/core/nano/manual-context-profile-style.ts`: profile-aware cevap uzunlugu
- `src/core/nano/manual-context-policy-guard.ts`: policy konsolidasyon guard

### Scripts

- `scripts/smoke-phase26-staged-context.ts`
- `scripts/smoke-phase27-manual-context-attach.ts`
- `scripts/smoke-phase28-manual-context-boundary.ts`
- `scripts/smoke-phase29-message-audit.ts`
- `scripts/smoke-phase30-message-metadata.ts`
- `scripts/smoke-phase31-manual-context-cleanup.ts`
- `scripts/smoke-phase32-ux-polish.ts`
- `scripts/smoke-phase33-nano-visible-context.ts`
- `scripts/smoke-phase34-nano-grounded-style.ts`
- `scripts/smoke-phase35-nano-visible-reference-style.ts`
- `scripts/smoke-phase36-nano-insufficient-context.ts`
- `scripts/smoke-phase37-nano-context-conflict.ts`
- `scripts/smoke-phase38-nano-answer-structure.ts`
- `scripts/smoke-phase39-nano-profile-aware-length.ts`
- `scripts/smoke-phase40-nano-manual-context-policy-guard.ts`
- `scripts/smoke-phase41-manual-context-flow-regression.ts`

## 7. Chat Tarafi Davranisi

- Staged context gecici olarak UI akisi icinde tutulur.
- Kullanici acikca manuel attach tetiklediginde gorunur block olusur.
- Marker tabanli boundary kontrolu yapilir.
- Audit sonucuna gore warning/safe state hesaplanir.
- Gecmis gorunumunde sadece UI-only metadata etiketi gosterilir.
- Cleanup ile block draft'tan kaldirilabilir.

## 8. Nano Tarafi Davranisi

Nano sadece kullanicinin gonderdigi gorunur mesaji gorur.

Manual context varsa:
- Visible context policy sinir koyar.
- Grounded style spekulasyonu azaltir.
- Visible reference policy referansi etikete indirger.
- Insufficient context policy ek baglam ister.
- Conflict policy kesin hukumden kacinir.
- Answer structure policy cevap organizasyonunu duzenler.
- Profile style policy cevap uzunlugunu profile gore ayarlar.
- Policy guard bunlari tek yerde konsolide eder.

## 9. RAG / Tool / Memory Farki

Bu akis:
- RAG retrieval zinciri degildir.
- Tool calling zinciri degildir.
- Memory write zinciri degildir.

Bu akis:
- Kullanici gorunur metnine dayali bir guvenli tasima ve yorumlama protokoludur.

## 10. Test ve Smoke Scriptleri

Asagidaki komutlar manuel context hattini asama asama dogrular:

- `npm run smoke:phase26-staged-context`
- `npm run smoke:phase27-manual-context-attach`
- `npm run smoke:phase28-manual-context-boundary`
- `npm run smoke:phase29-message-audit`
- `npm run smoke:phase30-message-metadata`
- `npm run smoke:phase31-manual-context-cleanup`
- `npm run smoke:phase32-ux-polish`
- `npm run smoke:phase33-nano-visible-context`
- `npm run smoke:phase34-nano-grounded-style`
- `npm run smoke:phase35-nano-visible-reference-style`
- `npm run smoke:phase36-nano-insufficient-context`
- `npm run smoke:phase37-nano-context-conflict`
- `npm run smoke:phase38-nano-answer-structure`
- `npm run smoke:phase39-nano-profile-aware-length`
- `npm run smoke:phase40-nano-manual-context-policy-guard`
- `npm run smoke:phase41-manual-context-flow-regression`

Genel dogrulama:
- `npm run typecheck`
- `npm run build`

## 11. Gelistirici Notlari

- Ornek path gerekiyorsa `example.ts` veya `[REDACTED_PATH]` kullan.
- Ornek secret gerekiyorsa `[REDACTED_SECRET]` kullan.
- Dokuman ve loglarda gercek user path kullanma.
- Public API degisiklikleri olmadan minimal ve test edilebilir adimlar tercih et.

## 12. Sik Yapilan Hatalar

- Manual context'i otomatik prompta eklemek.
- Metadata'yi model payload'ina tasimak.
- Reference satirini file path gibi cozmek.
- Nano'ya "dosyayi okudum" benzeri ifade ureten prompt yazmak.
- Staged context'i disk/localStorage/sessionStorage'a yazmak.
- Bu hattan search/RAG/tool yetkisi acmak.
- Full path, canonical path, raw content veya secret loglamak.

## 13. Gelecekte Dikkat Edilmesi Gerekenler

- Yeni degisiklikte once guvenlik siniri korunmali, sonra UX iyilestirmesi eklenmeli.
- Manual context sadece gorunur ve kullanici kontrollu olmali.
- Policy zinciri degistiginde regresyon smoke suiti mutlaka guncellenmeli.
- Yeni warning veya metadata alani eklenirse leak kontrolleri ayni anda eklenmeli.
