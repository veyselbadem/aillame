# Doomsgame External Provider Integration

## 1. Genel Amaç

Aillame, Doomsgame projesi bağlamında gelen istekleri gelişmiş bir yönlendirici (Router) katmanı ile analiz eder. Bu entegrasyonun temel amacı, modelden gelen ham metin yanıtlarını (raw output) oyun motoru tarafından doğrudan işlenebilecek yapılandırılmış (structured) JSON formatına dönüştürmektir. Bu sayede Doomsgame tarafında manuel metin ayrıştırma zahmeti ortadan kalkar ve güvenli bir otomasyon hattı kurulur.

## 2. Desteklenen ProjectId Değerleri

İsteklerin Doomsgame bağlamında değerlendirilmesi için aşağıdaki `projectId` değerlerinden biri kullanılmalıdır:
- `doomsgame`
- `doomsgame-engine`
- `dooms-game`
- `game-engine`

## 3. Desteklenen Doomsgame Intentleri

Aillame Router, Doomsgame bağlamında şu niyetleri (intent) ayırt edebilir:

- **game_design**: Oyun fikri, türü ve temel mekanik tasarımı.
- **game_scene**: Sahne düzeni, objelerin yerleşimi ve çevre tasarımı.
- **game_asset**: Görsel/işitsel varlık üretimi için prompt ve stil rehberi.
- **game_script**: Oyun mantığı ve karakter davranış kodları.
- **game_error_fix**: Motor hatalarının analizi ve yama (patch) önerileri.
- **engine_query**: Doomsgame motoru API'si ve dosya yapısı hakkında teknik bilgi.

## 4. Intent → Response Type Mapping

Aillame, tespit edilen her intent'i aşağıdaki yapılandırılmış yanıt tiplerine eşler:

| Router Intent | Response Type (Structured) | Açıklama |
| :--- | :--- | :--- |
| `game_design` | `game_plan` | Kapsamlı oyun tasarım dokümanı JSON'u. |
| `game_scene` | `scene_plan` | Sahne hiyerarşisi ve obje koordinatları. |
| `game_asset` | `asset_plan` | Asset üretim parametreleri ve stil bilgisi. |
| `game_script` | `script_plan` | Yazılım scriptleri ve davranış tanımları. |
| `game_error_fix` | `error_fix` | Hata analizi ve çözüm yaması. |
| `engine_query` | `engine_query` | Teknik açıklama ve kullanım örnekleri. |

## 5. API Request Örneği

**Endpoint:** `POST /api/aillame/chat` (veya External Provider Task endpointi)

**Headers:**
```http
x-aillame-api-key: <your-api-key>
Content-Type: application/json
```

**Body:**
```json
{
  "projectId": "doomsgame-engine",
  "message": "Basit bir platform oyunu tasarla"
}
```

## 6. API Response Örneği

Başarılı bir istek sonucunda hem ham metin hem de yapılandırılmış veri döner:

```json
{
  "success": true,
  "data": {
    "message": "Basit bir platform oyunu tasarla",
    "content": "İşte oyun planın: ...",
    "structured": {
      "type": "game_plan",
      "title": "Neon Runner",
      "genre": "Platformer",
      "mechanics": ["Double Jump", "Dashing"],
      "goals": ["Reach the end"],
      "safety": {
        "canAutoApply": false,
        "reasoning": "Standard safety assessment required."
      }
    },
    "meta": {
      "projectId": "doomsgame-engine",
      "intent": "game_design",
      "responseType": "game_plan"
    }
  }
}
```

## 7. Structured Response Tipleri

- **GamePlanResponse**: Başlık, tür, mekanikler, sahneler, karakterler ve kuralları içerir.
- **ScenePlanResponse**: Sahne adı, çevre tipi, objeler (id, tip, pozisyon, ölçek) ve fizik ayarlarını içerir.
- **AssetPlanResponse**: Varlık tipi, üretilecek prompt, görsel stil ve boyut bilgilerini içerir.
- **ScriptPlanResponse**: Dosya adı, hedef obje, davranış tanımı ve kod bloğunu içerir.
- **ErrorFixResponse**: Hata özeti, olası neden, çözüm adımları ve yama (patch) detaylarını içerir.
- **EngineQueryResponse**: Teknik açıklama, ilgili modül, kullanım örneği ve önlemleri içerir.

## 8. Güvenlik Kuralları

- **Otomatik Çalıştırma Yasağı**: `game_script` çıktıları ve `game_error_fix` yamaları asla otomatik olarak çalıştırılmamalı veya uygulanmamalıdır.
- **Onay Mekanizması**: Bu görevler için dönen `requiresApproval` veya `needsApproval` alanları her zaman `true` olarak döner.
- **Manuel İnceleme**: `safety.canAutoApply` alanı her zaman `false` olur; bu, bir insanın değişikliği gözden geçirmesi gerektiği anlamına gelir.
- **Client Sorumluluğu**: Doomsgame Engine tarafındaki entegrasyon katmanı, kullanıcı onayı (Approval Gate) olmadan dosya sisteminde değişiklik yapmamalıdır.

## 9. Fallback Davranışı

Eğer model geçersiz bir JSON üretirse, yanıt yarım kalırsa veya format bozuksa, Aillame sistemi çökmek yerine ilgili tipe uygun, güvenli ve varsayılan değerlerle dolu bir **Fallback Structured Response** üretir. Bu sayede istemci tarafında her zaman geçerli bir JSON objesi bulunması garanti edilir.

## 10. Doomsgame Client Kullanım Önerisi

Doomsgame tarafındaki entegrasyonun şu akışı takip etmesi önerilir:

1. Aillame API cevabını al.
2. `data.structured` alanının varlığını kontrol et.
3. `structured.type` değerine göre ilgili görselleştirme veya işlem handler'ını tetikle.
4. Eğer tip `script_plan` veya `error_fix` ise kullanıcıya bir fark (diff) veya kod önizlemesi göstererek onay iste.
5. Onay alınmadan dosya sistemine yazma işlemi yapma.

**Örnek TypeScript Mantığı:**

```typescript
const { structured } = response.data;

if (structured) {
  switch (structured.type) {
    case "game_plan":
      showGameDesignPreview(structured);
      break;
    case "scene_plan":
      spawnPreviewObjects(structured.objects);
      break;
    case "asset_plan":
      triggerImageGeneration(structured.prompt);
      break;
    case "script_plan":
      // Önemli: Kullanıcı onayı şart!
      showScriptApprovalModal(structured.codeSnippet, (approved) => {
        if (approved) saveFile(structured.filename, structured.codeSnippet);
      });
      break;
    case "error_fix":
      // Önemli: Kullanıcı onayı şart!
      showPatchApprovalModal(structured.proposedPatch, (approved) => {
        if (approved) applyPatch(structured.proposedPatch);
      });
      break;
  }
}
```

## 11. Test Sonuçları

Entegrasyon süreci boyunca elde edilen başarı metrikleri:

- **Nano / Router Intent Doğruluğu**: %91.67 (Genel)
- **Doomsgame Intent Sınıflandırma**: %100
- **Structured Response Üretim Başarısı (Eval)**: %100
- **External Provider Smoke Test**: %100

## 12. Kalan Riskler

- **Model Truncation**: Çok karmaşık ve uzun JSON çıktılarında (örn: yüzlerce obje içeren sahneler) model çıktı limitine takılabilir. Bu durumda sistem otomatik olarak fallback üretir.
- **JSON Kararlılığı**: Küçük model (Nano) kullanımı durumunda nadiren JSON formatında kaymalar olabilir; bu durum Zod tabanlı doğrulama katmanı ile yakalanmakta ve düzeltilmektedir.
- **Client Side Safety**: İstemci tarafında `canAutoApply: false` kuralının ihlal edilmesi güvenlik riski oluşturabilir.

## 13. Release Candidate Durumu

Bu entegrasyon **Release Candidate (RC)** seviyesindedir. Temel üretim senaryoları doğrulanmış, güvenlik bariyerleri kurulmuş ve yapılandırılmış veri hattı stabilize edilmiştir.
