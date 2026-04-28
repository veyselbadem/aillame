# Aillame MVP Kullanım Notları

## 1. Local Başlatma

Aillame MVP, Windows PowerShell üzerinde `npm.cmd` kullanılarak başlatılabilir.

Örnek komutlar:

- `npm.cmd run dev`
- `node_modules\.bin\next.cmd dev --port 3000`

`npm` yerine PowerShell içinde `npm.cmd` kullanmak, Windows yol ve betik çalıştırma sorunlarını azaltır.

## 2. Admin Girişi ve Güvenlik

Admin paneline (`/admin/login`) erişim için üç alan gereklidir:
- **Kullanıcı Adı**: `NEXT_PUBLIC_AILLAME_ADMIN_USERNAME` (Opsiyonel UI kontrolü)
- **Şifre**: `NEXT_PUBLIC_AILLAME_ADMIN_PASSWORD` (Opsiyonel UI kontrolü)
- **Sistem Tokenı**: `AILLAME_ADMIN_TOKEN` (**Sunucu tarafında doğrulanır**, zorunlu)

**Güvenlik Notu:** `NEXT_PUBLIC_` ile başlayan değişkenler istemci tarafında (tarayıcı) görünür olduğu için gerçek bir gizlilik sağlamaz. Asıl API güvenliği, sunucu tarafında korunan `AILLAME_ADMIN_TOKEN` ile sağlanmaktadır. Giriş sırasında girilen token, `/api/admin/verify` uç noktası üzerinden sunucu tarafında kontrol edilir; rastgele token girişlerine izin verilmez.

Çıkış yapıldığında tarayıcıdaki tüm oturum verileri (`localStorage`) temizlenir.

## 3. Ana Sohbet ve Nano Çekirdek

Ana sohbet varsayılan olarak **Nano-only** çalışır.

- **Zaman Aşımı (Timeout):** Nano modeli için varsayılan yanıt süresi 25 saniyedir. Bu süre `.env` içinde `NEXT_PUBLIC_AILLAME_NANO_TIMEOUT_MS` ile (5sn - 60sn arası) ayarlanabilir.
- **Hata Yönetimi:** Eğer model belirlenen sürede yanıt dönemezse veya hatalı/bozuk çıktı üretirse, sistem otomatik olarak kullanıcı dostu bir fallback (yedek) mesajı döner.
- **İşlem Durdurma:** Kullanıcı "Durdur" butonuna bastığında veya timeout olduğunda işlem güvenli bir şekilde sonlandırılır.

## 4. API Client Oluşturma

Admin API client yönetimi şu uç nokta üzerinden yapılır:

- `POST /admin/api-clients`
- `GET /admin/api-clients`

Gerekli alanlar:

- `projectId`
- `allowedModes`
- `allowedTasks`
- `allowedTools`

Notlar:

- `raw API key` sadece oluşturma sırasında bir kez gösterilir.
- `raw key` depolarda saklanmaz.
- Yanıtta `apiKeyHash` dönmez.

## 5. Provider Endpointleri

Aillame MVP dışa yönelik provider istekleri için şu uç noktaları destekler:

- `POST /api/v1/generate`
- `POST /api/external/generate`

Yetkilendirme başlıkları:

- `Authorization: Bearer <AILLAME_CLIENT_API_KEY>`
- `x-aillame-api-key: <AILLAME_CLIENT_API_KEY>`

## 6. Doomsgame Örneği

Örnek API client yapılandırması:

- `projectId`: `doomsgame`
- `allowedModes`: `content`, `general`
- `allowedTasks`:
  - `generate_news_draft`
  - `suggest_game_embeds`
- `allowedTools`:
  - `externalGenerate`

### Örnek request: `generate_news_draft`

```http
POST /api/v1/generate
Authorization: Bearer <AILLAME_CLIENT_API_KEY>
Content-Type: application/json

{
  "projectId": "doomsgame",
  "taskId": "generate_news_draft",
  "input": { "headline": "Yeni oyun haberi" }
}
```

### Örnek request: `suggest_game_embeds`

```http
POST /api/v1/generate
Authorization: Bearer <AILLAME_CLIENT_API_KEY>
Content-Type: application/json

{
  "projectId": "doomsgame",
  "taskId": "suggest_game_embeds",
  "input": { "context": "Oyun içeriği önerisi" }
}
```

## 7. Güvenlik Notları

- `raw key` loglanmaz.
- `apiKeyHash` response'ta dönmez.
- Admin token, external provider endpointlerinde kullanılmaz.
- `memoryWrite` varsayılan olarak `false`.
- `modelExecution` varsayılan olarak `false`.
- Otomatik memory yazma yok.
- Tool execution yok.

## 8. Nano Training ve Dataset Validator

Aillame, yerel modelin eğitimi için güvenli bir veri akışı sunar:
- **Nano Training Bridge:** Onaylanmış geri bildirimleri modelin anlayacağı eğitim formatına dönüştürür.
- **Dataset Validator (MVP):** Eğitim verilerini "İşlem durduruldu" hataları, sırlar veya yüksek riskli içerikler için otomatik olarak denetler.
- **Güvenli Export:** Sadece `admin` yetkisiyle, doğrulanmış ve düşük riskli veriler dışarı aktarılabilir.
- **Smoke Training (v1.3.1):** Modelin temel genel bilgi sorularına (ekonomi, yapay zeka vb.) anlamlı cevaplar verebilmesi için 1000 step'lik hafif bir eğitim fazı uygulanmıştır. Bu fazda `aillame_rust_tuned_v1_3_1_smoke.safetensors` adlı özel checkpoint üretilmiştir.

## 9. Integration Kit ve SDK

Dış sistemlerin (Doomsgame, BOSS, Bademakademi vb.) Aillame'e kolayca bağlanması için:
- **SDK:** `src/sdk/aillame-client.ts` üzerinden standart bir API istemcisi sunulur.
- **Health & Capabilities:** `/api/v1/health` ve `/api/v1/capabilities` üzerinden servis durumu ve özellikleri sorgulanabilir.
- **Entegrasyon Rehberi:** `docs/INTEGRATION_GUIDE.md` dosyasında detaylı örnekler mevcuttur.

## 10. Audit Log ve İzlenebilirlik

Platform güvenliği için kritik olaylar (admin girişi, API anahtarı oluşturma, hatalı denemeler vb.) `data/audit_logs.json` dosyasına kaydedilir. Bu kayıtlar hassas bilgiler (şifre, ham token) içermez.

## 11. Nano Cognitive Layer (Atom Karınca Görev Zekâsı)

Aillame Nano, sadece bir metin üreticisi değil, sistemin akıllı orkestratörü olarak çalışır. "Cognitive Layer" sayesinde şu yeteneklere sahiptir:
- **Görev Sınıflandırma:** Gelen mesajın sosyal, teknik, güncel araştırma veya görsel üretim olup olmadığını anlar.
- **Akıllı Yönlendirme:** Görevi en uygun modüle (Web Search, SDXL, Qwen veya QuickResponse) paslar.
- **Güvenli Cevap Katmanı:** Ham model çıktılarını denetler, gibberish (anlamsız metin) veya hatalı JSON çıktılarını engeller.
- **AI Lab Yorumlama:** Diğer modellerin (Qwen, Web Search) çıktılarını analiz eder, özetler ve "öğrenme adayı" önerir.

**Nano'nun Yeni Rolü:** Nano = Görev Anlayıcı + Yönlendirici + Kısa Yorumlayıcı + Öğrenme Adayı Çıkarıcı.


## 12. AI Lab (Modeller Arası Sohbet)

Admin panelindeki AI Lab, farklı modellerin (Nano, Gemma, Qwen, Gemini) bir konu üzerinde tartışabildiği bir ortamdır. 

- **Gemma 4 E4B (Fast Analysis):** AI Lab oturumlarında hızlı analiz ve diyalog için Gemma 4 E4B desteği eklenmiştir. GGUF formatı ile llama.cpp üzerinden çalıştırılması tavsiye edilir.

### Gemma 4 E4B Kurulumu (GGUF - Önerilen):
1. GGUF dosyasını doğrulayın: `C:\aillame-models\gguf\gemma-4-E4B-it-Q4_K_M.gguf`
2. `llama-server` uygulamasını doğrulayın: `C:\aillame-llama\llama-server.exe`
3. Önerilen yöntem: Aillame'nin Gemma gerektiğinde server'ı otomatik başlatmasına izin verin.

```env
AILLAME_GEMMA_ENABLED=true
AILLAME_GEMMA_AUTO_START=true
AILLAME_GEMMA_RUNTIME=gguf
AILLAME_GEMMA_SERVER_URL=http://127.0.0.1:8080
AILLAME_GEMMA_MODEL_ID=gemma-4-E4B-it-Q4_K_M.gguf
AILLAME_GEMMA_LLAMA_SERVER_EXE=C:\aillame-llama\llama-server.exe
AILLAME_GEMMA_MODEL_PATH=C:\aillame-models\gguf\gemma-4-E4B-it-Q4_K_M.gguf
AILLAME_GEMMA_PORT=8080
AILLAME_GEMMA_CONTEXT_SIZE=8192
AILLAME_GEMMA_STARTUP_TIMEOUT_MS=60000
AILLAME_GEMMA_TIMEOUT_MS=60000
```

Runtime durumu:

```powershell
curl.exe "http://localhost:3000/api/core/gemma-runtime/status"
```

4. Manuel yöntem gerekirse server'ı ayrıca başlatın:

```powershell
cd C:\aillame-llama
.\llama-server.exe -m "C:\aillame-models\gguf\gemma-4-E4B-it-Q4_K_M.gguf" --port 8080 -c 8192
```

CUDA offload destekleniyorsa alternatif:

```powershell
.\llama-server.exe -m "C:\aillame-models\gguf\gemma-4-E4B-it-Q4_K_M.gguf" --port 8080 -c 8192 --n-gpu-layers 999
```

5. Smoke test:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
Invoke-RestMethod http://127.0.0.1:8080/v1/models
```

6. Direkt llama-server chat testi için PowerShell'de JSON'u UTF-8 dosyaya yazıp `curl.exe --data-binary` kullanın. Tek satır `curl --data-raw` JSON veya `^` satır devam karakteri PowerShell'de gövdeyi bozabilir.

```powershell
$body = @{
  model = "gemma"
  messages = @(
    @{ role = "system"; content = "Cevabı doğrudan ver. Düşünme sürecini yazma. Sadece final cevap ver." },
    @{ role = "user"; content = "Türkçe eş anlamlı kelimelerden 5 örnek ver." }
  )
  max_tokens = 256
  temperature = 0.4
} | ConvertTo-Json -Compress -Depth 5
$body | Set-Content -Path "$env:TEMP\gemma-llama-test.json" -Encoding utf8
curl.exe -X POST "http://127.0.0.1:8080/v1/chat/completions" `
  -H "Content-Type: application/json; charset=utf-8" `
  --data-binary "@$env:TEMP\gemma-llama-test.json"
```

7. Aillame endpoint testi:

```powershell
$body = @{ prompt = "Türkçe eş anlamlı kelimelerden 5 örnek ver." } | ConvertTo-Json -Compress
$body | Set-Content -Path "$env:TEMP\gemma-test.json" -Encoding utf8
curl.exe -X POST "http://localhost:3000/api/core/gemma-chat" `
  -H "Content-Type: application/json; charset=utf-8" `
  --data-binary "@$env:TEMP\gemma-test.json"
```

PowerShell `Invoke-RestMethod | ConvertTo-Json` bazı terminallerde ekrana basarken Türkçe karakter görüntüsünü yanıltabilir. Karar için `curl.exe --data-binary`, Node `fetch` veya tarayıcı Network response kullanılmalıdır.

Beklenen davranış: auto-start açıksa Aillame önce `/v1/models` veya `/health` ile server durumunu kontrol eder; kapalıysa `llama-server.exe` sürecini arka planda `shell:false` ile başlatır. Başlatılamazsa `runtime_start_failed`, server kapalıysa `server_offline`, timeout olursa `timeout`, boş yanıt gelirse `empty_response` kodlu structured JSON döner. AI Lab `nano + gemma` akışında hata durumunda Gemma tekrar denenmez ve Nano final summary üretir.

### Gemma 4 E4B Kurulumu (Transformers):
1. `huggingface-cli login` ile giriş yapın (Model erişim izni gerekebilir).
2. `huggingface-cli download google/gemma-4-E4B-it` komutunu çalıştırın.
3. `.env` dosyasında `AILLAME_GEMMA_RUNTIME=transformers` olarak ayarlayın.

### Qwen3-VL 8B (Opsiyonel Ağır Model)
Qwen modeli sistemde yüklü kalsa da, varsayılan akışlardan tamamen izole edilmiştir.
Sadece manuel derin görsel analiz isteklerinde (AI Lab üzerinden bilinçli seçilirse) devreye girer. Yüksek RAM tüketimi nedeniyle otomatik çağrılmaz. Gelecekte hafif görsel işlemler için Qwen3-VL 4B adayı sisteme eklenecektir.

Tartışmalardan elde edilen veriler, Nano'nun "uzmanlaşması" için eğitim verisi adayı olarak kullanılır.
