# Aillame Beta Foundation - Release Candidate (v1.3.0-beta.rc1)

Bu belge, Aillame projesinin "Post-Beta" fazları sonundaki genel durumunu, tamamlanan özelliklerini ve final yayını için bekleyen kriterleri özetler.

## Genel Durum (Overall Status)
- **Beta Foundation Ready:** ✅ YES (Altyapı katmanları tamamlandı)
- **Live Runtime Acceptance Ready:** ⚠️ NO (Yerel model konfigürasyonu bekleniyor)

## Tamamlanan Temel Fazlar
- **Phase 1: Persistent Storage & Health:** `.aillame-data` kök dizini ve JSONL bazlı kalıcı veri saklama altyapısı.
- **Phase 2: Security Hardening:** API key hashleme, masked display ve audit log redaction.
- **Phase 3: External Provider E2E:** OpenAI-compatible gateway ve external SDK entegrasyonu.
- **Phase 4: Code Agent Approval:** Approval-gated patch workflow ve güvenli dosya yazma.
- **Phase 5: Model Discovery:** GGUF dosya tarayıcı, compatibility scoring ve watchlist.
- **Phase 6: Nano Evaluation:** Proje bazlı model değerlendirme ve eğitim hattı iskeleti.
- **Phase 7: RAG Document Library:** Kalıcı döküman kütüphanesi, chunking ve vector persistence.
- **Phase 8: Image Runtime:** Image Asset Manager, job history ve IGM worker contract.
- **Phase 9: Desktop Readiness:** Local server boot strategy ve desktop shell bridge.

## Final Kabul Kriterleri (Final Acceptance Criteria)
Aillame'in "Beta" olarak tam kullanılabilir sayılabilmesi için şu iki yerel motorun gerçek üretim yapması şarttır:
1. **Local LLM (Nano/GGUF):** Metin üretimi (`smoke:live-text-runtime`) başarılı olmalı.
2. **Local IGM (Diffusion):** Görsel üretimi (`smoke:live-image-runtime`) başarılı olmalı.

## Bilinen Sorunlar (Known Issues)
- **ISS-1:** PDF ve DOCX dosyaları için şu an sadece plain-text extraction desteği mevcuttur.
- **ISS-2:** Gerçek zamanlı embedding üretimi için placeholder adapter kullanılmaktadır.
- **ISS-3:** GGUF modelleri için otomatik indirme mekanizması sadece plan aşamasındadır (watchlist).
- **ISS-4:** Yerel IGM (Stable Diffusion) worker'ı için model ağırlıkları (`.safetensors`) manuel konfigürasyon gerektirir.

## QA ve Doğrulama
Sistemin tüm katmanları şu komutla uçtan uca doğrulanabilir:
```bash
npm run qa:beta
```

## Sonraki Adımlar (Next Steps)
- Yerel IGM worker'ının Python/WASM diffusion motoruna bağlanması.
- GGUF modelleri için gerçek zamanlı yükleme (loading) testlerinin tamamlanması.
- Desktop shell (Tauri/Electron) paketleme denemeleri.
