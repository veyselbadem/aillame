# Aillame Local Distillation Dataset Altyapısı Mimari Kılavuzu

Bu doküman, Aillame Nano'nun yerel bilişsel router ve asistan yeteneklerini gelecekte ince ayar (fine-tuning) ve distillation döngüleriyle geliştirebilmesi için kurulan **güvenli, kullanıcı denetimli yerel veri toplama altyapısını** tanımlar.

> [!IMPORTANT]
> Bu sistem kesinlikle bir model eğitimi başlatmaz ve fine-tuning scriptlerini tetiklemez. Yalnızca gelecekteki eğitimler için yerel, temizlenmiş ve kullanıcı onaylı veri örnekleri hazırlar.

---

## 1. Mimari Tasarım ve Storage

Veri seti, HP OMEN yerel donanımında, Next.js ana uygulama dizininin altında JSON Lines formatında saklanır:
- **Dosya Yolu:** `.aillame-data/stores/aillame-distillation-dataset.jsonl`
- **Dosya Formatı:** Her satırda tek bir JSON kaydı içeren `JSONL` biçimi.
- **Güvenli Atomik Append:** Yazma ve silme işlemleri sırasında veri kaybı veya dosya bozulmasını önlemek için geçici bir dosya `.jsonl.tmp` üzerine yazılıp ardından atomik olarak asıl dosyanın üzerine taşınır (renameSync). Bozuk satırlar skip edilerek self-healing sağlanır.

---

## 2. AillameDistillationSample Türleri ve Şeması

```typescript
type AillameDistillationSample = {
  id: string;
  kind: "routing" | "tool_use" | "safety_block" | "project_context" | "memory_retrieval" | "chat_quality";
  source: "user_approved" | "manual" | "system_suggested";
  approved: boolean;
  redactedPrompt: string;
  rawPromptStored: false;
  expected: unknown;
  metadata: {
    intent?: string;
    target?: string;
    toolId?: string;
    projectId?: string;
    memoryTags?: string[];
    routeConfidence?: number;
    safetyFlags?: string[];
    modelId?: string;
  };
  createdAt: string;
  updatedAt: string;
};
```

---

## 3. Güvenlik Kalkanı ve Veri Maskeleme (Anonymization)

Hassas kullanıcı bilgilerinin eğitim verisine sızmasını önlemek için üç katmanlı bir güvenlik mekanizması uygulanır:

1. **Hassas İsteklerin Engellenmesi (Safety Shield):**
   - Sohbet üzerinden veya API aracılığıyla `"tokenları dataset'e kaydet"`, `"env dosyamı eğitim verisine ekle"` gibi sızma veya istismar amaçlı promptlar algılandığında **Central Safety Shield** devreye girer. İstek anında engellenir ve **`aillame-nano-v1-tool-blocked`** modeliyle reddedilir.
2. **Kriter Bazlı Outright Rejection:**
   - Prompt içerisinde `.env`, `dotenv`, `registry`, `system32` veya `private_key` gibi kritik kalıplar yer alıyorsa örnek kaydı tamamen reddedilir.
3. **Güvenli Maskeleme (Anonymization):**
   - Kayıt öncesinde girdideki API Key'ler, e-posta adresleri, T.C. Kimlik Numaraları ve kredi kartı numaraları regex algoritmalarıyla otomatik olarak sansürlenir (Ör. `[REDACTED_API_KEY]`, `[REDACTED_CARD]`).
   - `rawPromptStored` alanı kalıcı olarak `false` tutulur, sadece temizlenmiş `redactedPrompt` saklanır.

---

## 4. API Endpointleri

Tüm API uçları yerel port üzerinden güvenli bir şekilde sunulur:

- `GET /api/aillame/distillation/dataset`: Veri setindeki örnekleri filtreleyerek veya liste halinde döner.
- `POST /api/aillame/distillation/dataset`: Manuel veya onaylı yeni bir öğrenme örneği ekler.
- `DELETE /api/aillame/distillation/dataset?id={id}`: ID'si belirtilen örneği veri setinden kalıcı olarak kaldırır.
- `GET /api/aillame/distillation/dataset/stats`: Örnek türlerine göre sayısal dağılım istatistiklerini getirir.
- `GET /api/aillame/distillation/dataset/export`: Veri setini doğrudan indirilebilir standart `application/x-jsonlines` formatında export eder.
- `POST /api/aillame/distillation/dataset/suggest`: Chat akışından gelen parametreleri analiz ederek kalıcı veri setine eklenebilecek bir aday önerisi üretir fakat **kullanıcı onayı olmadan kaydetmez**.

---

## 5. Güvenli Yerel Araçlar (Read-Only Tools)

Tool-use mimarisi kapsamında distillation sistemini sorgulayabilecek 3 yeni güvenli araç tescil edilmiştir:

1. `distillation.stats`: Kayıt sayılarını ve kategorileri döndürür.
2. `distillation.search`: Veri seti içinde kelime bazlı arama yapar.
3. `distillation.list`: Kayıtlı örnekleri liste halinde döndürür.

---

## 6. Premium Settings "Nano Öğrenme Verileri" Paneli

Kullanıcı arayüzünde Ayarlar sekmesine eklenen neon kehribar (amber) renk şemalı lüks yönetim paneli:
- **Eğitim Uyarı Kartı:** Kullanıcıyı veri toplama sınırları ve kişisel veri gizliliği konusunda açıkça uyarır.
- **İstatistik Kartları:** Kategorilere göre anlık kayıt sayılarını grafiksel/sayısal gösterir.
- **Manuel Veri Ekleme Formu:** İstenen türde prompt ve beklenen JSON çıktısını güvenle kaydeder (JSON format hatası durumunda kullanıcıyı uyarır).
- **Arama ve Listeleme:** Kayıtlı örnekleri sansürlenmiş prompt ve expected çıktı detaylarıyla listeler.
- **JSONL Export Düğmesi:** Tek tıkla veri setini indirme imkanı tanır.
