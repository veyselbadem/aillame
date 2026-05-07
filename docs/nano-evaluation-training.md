# Aillame Nano Evaluation & Training Pipeline

Aillame Nano, sürekli öğrenen ve ölçülebilir bir yapıya sahiptir. Bu belge, Nano'nun değerlendirme ve eğitim süreçlerini açıklar.

## Evaluation Pipeline (Değerlendirme Hattı)

Nano'nun kararları ve çıktı kalitesi dört ana eksende ölçülür:

1.  **Project-Aware Routing:** Nano'nun projeler (Aillame, BOSS AI, Badem Akademi, Doomsgame) arasındaki bağlamı karıştırmadan doğru `projectId` ve `mode` seçimi yapması.
2.  **Turkish Quality (TR-EVAL):** Türkçe karakter bütünlüğü (ğ, ü, ş, ı, ö, ç) ve dilin akıcılığı.
3.  **JSON Output Schema:** Karar mekanizmasının (expectedDecision) geçerli ve parse edilebilir JSON üretmesi.
4.  **Safety & Fallback:** Riskli taleplerde `fallbackRecommended: true` ve `autonomousActionsEnabled: false` davranışlarının korunması.

## Training Pipeline (Eğitim Hattı)

Eğitim verileri şu aşamalardan geçer:

1.  **Feedback Candidate:** Kullanıcıdan gelen geri bildirimler "pending-review" olarak kaydedilir.
2.  **Review & Approval:** Admin panelinden incelenen ve onaylanan (approved) kayıtlar eğitim adayı olur.
3.  **Export:** Onaylı kayıtlar `scripts/export-nano-training-candidates.mjs` ile eğitim setine aktarılır.
4.  **Validation:** `scripts/validate-nano-training-candidates.mjs` ile secret (API key, token) ve kalite denetimi yapılır.

## Güvenlik Sınırları

- **Otonom Eğitim Kapalı:** Model dosyaları (`.bin`, `.gguf`) kullanıcı onayı ve manuel tetikleme olmadan asla güncellenmez.
- **Secret Detection:** Eğitim verilerinde API anahtarı veya şifre tespit edilirse kayıt otomatik olarak reddedilir.
- **Checkpoint Comparison:** Yeni bir model sürümü (checkpoint) devreye alınmadan önce eski sürümle kıyaslama raporu sunulur.

## Komutlar

```bash
# Evaluation çalıştır
npm run eval:nano

# Eğitim adaylarını doğrula
npm run validate:nano-training-candidates

# Pipeline smoke testi
npm run smoke:nano-eval-training
```
