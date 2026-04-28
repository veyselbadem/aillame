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

## 5. Smoke Training Phase (v1.3.1) & Cognitive Strategy

Eğitim sisteminin doğrulanması için "Smoke Training" fazı uygulanmıştır.

-   **Yeni Checkpoint:** `aillame_rust_tuned_v1_3_1_smoke.safetensors` (Teknik olarak başarılı, kalite olarak yetersiz).
-   **Önemli Karar:** Smoke checkpoint testlerden (kalite/Türkçe doğallığı) geçemediği için **aktif edilmemiştir**.
-   **Aktif Checkpoint:** `aillame_rust_tuned.safetensors` kullanılmaya devam etmektedir.

### Yeni Strateji: Cognitive Layer (Atom Karınca)
Nano modelini ham metin üretmeye zorlamak yerine, önce "Görev Zekâsı" (Cognitive Layer) ile güçlendirilmiştir:
1.  **Nano Ham Çıktı Güvenliği:** Nano'nun ham çıktıları gibberish (anlamsız) ise asla kullanıcıya gösterilmez; bunun yerine akıllı fallback veya Qwen/Pro cevabı devreye girer.
2.  **Merkezi Orkestratör (Intent Detection):** Nano, gelen isteği anlar. `social_chat`, `definition`, `list_examples`, `compare`, `research`, `continue_context` gibi niyetleri ayırt ederek doğru modüle (Web Search, SDXL, Qwen) paslar.
3.  **AI Lab Katılımı:** Nano artık AI Lab'de diyalogları yorumlar ve "öğrenme adayı" önerir, ancak ham model çıktısı doğrudan tartışmaya girmez.
4.  **Güvenli Öğrenme Adayı (Candidate Guard):** Nano; hata mesajlarından (timeout, degraded, fetch failed), çok kısa yanıtlardan veya bozuk JSON çıktılarından kesinlikle öğrenme adayı türetmez. Adaylar en az 40 karakter uzunluğunda ve temiz bilgi içermelidir.
4.  **Kontrollü Eğitim:** Gerçek Nano checkpoint iyileştirmesi (tokenizer/decode/dataset) ayrı ve kontrollü bir fazda, admin onayıyla yapılacaktır.
