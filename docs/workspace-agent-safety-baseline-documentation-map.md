# Workspace Agent Safety Baseline Documentation Map

## 1. Amaç
Bu doküman, Workspace Agent projesi kapsamında tamamlanan güvenlik temeli (Safety Baseline) dokümantasyon hattının hiyerarşisini ve okuma sırasını tanımlar.

## 2. Dokümantasyon Hiyerarşisi (Okuma Sırası)

### Seviye 1: Giriş ve Merkezi İndeks
- **[Safety Architecture Index](./workspace-agent-safety-architecture-index.md)** (İndeks)
    - Tüm güvenlik mimarisinin merkezi navigasyon ve katman özetidir.

### Seviye 2: Yayın Hazırlık ve Karar Kayıtları
- **[Safety Architecture Release Readiness](./workspace-agent-safety-architecture-release-readiness.md)** (Release-Readiness)
    - Sistemin "No-Execution Baseline" statüsündeki yayın hazırlık değerlendirmesidir.

### Seviye 3: Regresyon ve Kilitlenme (Lock) Kayıtları
- **[Final Regression Anchor](./workspace-agent-safety-architecture-final-regression-anchor.md)** (Regression Anchor)
    - Güvenlik sınırlarını dökümantasyon seviyesinde donduran final regresyon çapasıdır.

### Seviye 4: Kapanış ve Bütünlük Kayıtları
- **[Post-Freeze Integrity Summary](./workspace-agent-post-freeze-integrity-summary.md)** (Post-Freeze Record)
    - Dondurma sonrası bütünlük kuralları ve yürütme yol haritası sınırı beyanıdır.
- **[Baseline Documentation Map](./workspace-agent-safety-baseline-documentation-map.md)** (Final Closure)
    - Mevcut dokümantasyon hattının final navigasyon haritasıdır.

---

## 3. Doküman Tipleri Tanımı
- **Index:** Merkezi yönlendirme ve katman özeti sağlayan rehber.
- **Release-Readiness:** Belirli bir kapsam için yayınlanma uygunluğu beyanı.
- **Regression Anchor:** Güvenlik sınırlarını ve test kriterlerini sabitleyen mühür.
- **Post-Freeze Record:** Dondurulmuş statünün gelecekteki yorumlanma sınırlarını belirleyen kayıt.

## 4. Güvenlik Notu
Bu dökümantasyon haritası içindeki hiçbir doküman gerçek yürütme (execution), dosya yazma (file write) veya yetki (grant) vaat etmez. Tüm hat **No-Execution** statüsünde mühürlenmiştir.
