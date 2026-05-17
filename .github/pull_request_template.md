## Pull Request Açıklaması
Bu değişikliklerin amacı ve çözdüğü problem nedir?

## Yapılan Değişiklikler
- ...

---

## 🛡️ Geliştirici Kontrol Listesi (Developer Checklist)

Lütfen PR'ı açmadan önce tüm maddelerin başarıyla tamamlandığını doğrulayın:

- [ ] **Typecheck Başarılı:** `npm run typecheck` sıfır hata ile tamamlandı.
- [ ] **Build Başarılı:** `npm run build` ile Next.js ve NAPI-RS derlemesi hatasız yapıldı.
- [ ] **Tauri Build Test Edildi:** `npx tauri build` ile installer paketleri sorunsuz derlendi.
- [ ] **Smoke Testleri Tamam:** İlgili tüm test scriptleri (`node scripts/smoke-phase7.1-all-validations.ts` vb.) 100% yeşil geçiş sağladı.
- [ ] **Güvenlik Kalkanı (Safety Shield) Korundu:** Central Safety Shield prompt algılama ve zararlı komut kısıtlama mimarisi bozulmadı, korundu.
- [ ] **Model Dosyaları Ekleme Yok:** Dev model ağırlıkları (.gguf, .safetensors) repository'ye yanlışlıkla commit edilmedi.
- [ ] **Release Dosyaları Ekleme Yok:** `release/` klasörü altındaki binary veya ZIP artifactleri repository'ye dahil edilmedi.
- [ ] **Veri Temizliği:** `.aillame-data/` altındaki yerel kullanıcı test veri tabanları repoya eklenmedi.
- [ ] **Dokümantasyon Güncellendi:** Geliştirilen özellikle ilgili `docs/` kılavuzlarında gerekli güncellemeler yapıldı.
