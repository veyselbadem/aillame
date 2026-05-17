# Aillame Nano Orchestration Contract

Aillame Nano, sistemin beyni ve orkestra şefidir. Nano Contract, Nano'nun görevleri nasıl analiz ettiğini, planladığını ve uzman modelleri (capability slots) nasıl yönettiğini tanımlayan standart bir protokoldür.

## 1. Nano'nun Rolü

Aillame Nano bir model değil, bir **Orchestration Layer** (Orkestrasyon Katmanı) olarak davranır:
- **Analyze**: Gelen metni, görselleri ve bağlamı inceler.
- **Plan**: Görevi capability tabanlı adımlara böler.
- **Select**: Her adım için en uygun modeli (Primary/Fallback) Capability Registry üzerinden belirler.
- **Execute**: Adımları sırasıyla veya paralel olarak çalıştırır.
- **Finalize**: Sonuçları birleştirip kullanıcıya güvenli ve tutarlı bir yanıt döner.

## 2. Input Contract (`NanoTaskInput`)

Nano'ya gelen her istek aşağıdaki yapıya normalize edilir:
- `taskId`: Tekil görev kimliği.
- `source`: İsteğin kaynağı (chat, API, sistem olayı vb.).
- `language`: Algılanan dil (tr, en, mixed).
- `attachments`: Görsel, dosya veya URL ekleri.
- `context`: Aktif proje, domain ve kullanılabilir yetenekler.

## 3. Plan Formatı (`NanoOrchestrationPlan`)

Nano, her görev için bir "Plan" oluşturur:
- `intent`: Görevin ana amacı (örn: `seo_content`, `code_generation`).
- `steps`: Capability bazlı uygulama adımları.
- `needsUserApproval`: Kritik işlemler (dosya silme, model indirme vb.) için kullanıcı onayı bayrağı.
- `safetyFlags`: Güvenlik ve kısıtlama etiketleri.

## 4. Capability Tabanlı Karar Verme

Nano, model isimleriyle (`qwen...`) değil, yeteneklerle (`text.general`, `vision.review`) konuşur.
- **Primary**: Plan için ideal yetenek.
- **Fallback**: Yetenek mevcut değilse veya hata verirse alternatif rota.
- **Degraded**: Gerekli yetenek yoksa planın kısıtlı kapasiteyle devam edeceği durumu.

## 5. Güvenlik ve Onay Kuralları

Aşağıdaki durumlarda `needsUserApproval: true` zorunludur:
- **Sistem Değişiklikleri**: Model indirme, silme, yapılandırma değişikliği.
- **Dosya İşlemleri**: Kritik dosya yazma veya toplu silme.
- **Hassas Veri**: Dış API'lere veri gönderimi.
- **Hassas Alanlar**: Hukuk, sağlık veya finansal tavsiye içeren içerikler (Safety Review gerektirir).

## 6. Örnek İş Akışı: "Görselli SEO Makalesi"
1. **Input**: "Hukuk sitem için görselli SEO makalesi yaz."
2. **Analysis**: Intent: `seo_content`, Language: `tr`.
3. **Plan**:
   - Step 1: `text.general` -> Makale taslağı üret.
   - Step 2: `image.generate` -> Kapak görseli üret.
   - Step 3: `vision.review` -> Görsel SEO uyumluluğunu denetle.
   - Step 4: `safety.review` -> Hukuki terim doğruluğunu denetle.
4. **Resolution**: `text.general` -> `qwen3-8b` (veya fallback: `qwen2.5-0.5b`).
5. **Output**: Makale + Görsel + Güvenlik Onayı.

---
**Son Güncelleme**: 2026-05-16
**Versiyon**: 1.3.0-contract-stable
