# Aillame Nano Training Altyapısı

Bu doküman, Aillame Nano modelinin eğitim hazırlık sürecini ve veri export pipeline'ını açıklar.

## 1. Eğitim Pipeline Akışı

Sistem, kullanıcı etkileşimlerinden otonom olarak öğrenme adayları türetir:

1.  **Feedback**: Kullanıcı bir cevaba like/dislike bırakır.
2.  **Learning Candidate**: Feedback'e göre otomatik bir öğrenme adayı oluşur.
3.  **AI Lab**: Admin kontrollü modeller arası tartışmalardan yüksek kaliteli eğitim verisi üretilir.
4.  **Distillation Preview**: Aday, admin panelinde incelenmek üzere bir "eğitim önizlemesi"ne dönüşür.
5.  **Memory Write Queue**: Admin onayından geçen preview'lar yazım kuyruğuna alınır.
6.  **Memory Card**: Kuyruktaki kayıtlar aktif eğitim verisi (hafıza kartı) haline gelir.

## 2. Dataset Export (MVP)

Gerçek model eğitimi (fine-tuning) için güvenli veri setleri dışarı aktarılabilir.

**Endpoint:** `POST /api/admin/nano-training/export`
**Auth:** `x-aillame-admin-token` header'ı zorunludur.

### Güvenlik Kuralları:
- Sadece **Approved** (Admin tarafından onaylanmış) veriler export edilir.
- Sadece **Low-Risk** veya **Medium-Risk** veriler export edilir. **High-Risk** veriler filtrelenir.
- **Bozuk Çıktı Filtresi**: "İşlem durduruldu", "hata oluştu" gibi ifadeler içeren kayıtlar otomatik olarak elenir.
- **Source Isolation**: Veriler `memory_card` ve `distillation_preview` kaynaklarından toplanır.

## 3. Nano Engine Entegrasyonu

Mevcut eğitim döngüsü (`src/core/engine/train-rust.ts`) henüz `MemoryCard` sistemine doğrudan bağlı değildir. Eğitim şu an `src/core/engine/data/input.txt` dosyasındaki ham metin verisi üzerinden yapılmaktadır.

Gelecek aşamada, `export` endpoint'inden gelen yapılandırılmış verilerin (Instruction/Input/Output) Rust Core eğitim döngüsüne beslenmesi planlanmaktadır.

## 4. Veri Kalitesi Denetimi

`input.txt` içindeki veriler periyodik olarak taranmalı ve "İşlem durduruldu" gibi asistan hatalarından arındırılmalıdır. Bu işlem için `nano-training/validator.ts` içindeki mantık kullanılabilir.
