# Nano Evaluation and Training Preparation

Nano, Aillame'in ana chat modeli değildir. Güncel rolü; karar, değerlendirme, güvenlik, fallback ve learning-candidate önerileri üreten **advisory/eval çekirdeği** olmaktır.

Nano hiçbir fazda kullanıcı onayı olmadan dosya yazma, komut çalıştırma, dış network çağrısı veya self-training başlatma yetkisi almaz. `autonomousActionsEnabled` false kalır.

## Güvenli Veri Akışı

1. **Feedback:** Kullanıcı geri bildirimi alınır.
2. **Learning Candidate:** Feedback veya Lab çıktısı candidate olarak kaydedilir.
3. **Validation:** Secret/sensitive content, kalite, Türkçe karakter ve schema kontrolleri yapılır.
4. **Admin Review:** Candidate admin onayı bekler.
5. **Export:** Yalnızca approved candidate kayıtları dataset export kapsamına girer.

Feedback doğrudan eğitime gitmez. Rejected, ignored veya pending-review kayıtlar training dataset'e aktarılmaz.

## AI Lab ile İlişki

Aillame Lab, model ve prompt davranışlarını denemek için kullanılan evaluation/playground alanıdır. Lab çıktıları, Nano'yu doğrudan eğitmez. Lab yalnızca kaliteli candidate üretmek için bir kaynak olabilir; final karar validator ve admin review tarafından verilir.

## Dataset Standartları

Nano datasetleri şu kategorilerde tutulur:

- `instruction`
- `classification`
- `project-aware`
- `safety`
- `eval`
- `feedback`

Her kayıt project isolation, metadata source ve expectedDecision kontrollerinden geçmelidir. Project-aware örneklerde geçerli project preset kullanılmalıdır.

## Runtime Acceptance ile İlişki

Nano eval pipeline'ın başarılı olması, Live Runtime Acceptance anlamına gelmez. Final kabul için:

1. Bir yerel LLM gerçek metin üretmelidir.
2. Bir yerel IGM gerçek görsel üretmelidir.
3. İkisi de Aillame-controlled runtime/worker üzerinden yönetilmelidir.

Nano bu kabulde yardımcı karar/eval katmanıdır; yerel LLM kabul kriterinin yerine geçmez.

## Doğrulama

```bash
npm run validate:nano-data
npm run diagnostic:nano-tokenizer
npm run smoke:nano-eval-training
```
