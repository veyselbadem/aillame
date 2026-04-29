# Aillame Model Orchestration & AI Lab

Aillame, farklı yapay zeka modellerinin (Nano, Qwen, SDXL, Gemini) ve araçların (Web Search) uyum içinde çalıştığı bir orkestrasyon katmanına sahiptir.

## 1. Model Orchestration Router

Kullanıcı ana sayfada sadece Aillame Nano ile konuşur. Ancak arka planda Nano, isteğin türünü analiz ederek en uygun modele yönlendirme yapar.

- **Simple Chat:** Nano (Local) cevap verir.
- **Fast Analysis:** Gemma 4 E4B (GGUF veya Transformers) planlanır.
- **Deep Vision/Analysis:** Qwen3-VL 8B (Ağır Model) manuel isteklerde planlanır.
- **Image Generation:** SDXL planlanır.
- **Web Research:** Web Search araçları planlanır.

Eğer ilgili model henüz bağlı değilse, sistem `planning_only` modunda kullanıcıya bilgilendirici bir yanıt döner.

## 2. AI Lab (Yönetici Paneli)

Yöneticiler için özel olarak tasarlanan AI Lab, modeller arası kontrollü tartışmaların yapılabildiği bir laboratuvar ortamıdır.

### Özellikler:
- **Session Management:** Admin tarafından başlatılan, durdurulan ve duraklatılabilen oturumlar.
- **Controlled Multi-Step Loop:** Admin tek tıkla 3-5 adımın (turn) otomatik çalışmasını tetikleyebilir.
- **Safety Loop:** Sonsuz döngü engellenmiştir. `maxTurns` dolduğunda veya admin `stop` dediğinde sistem durur.
- **Error Handling:** Bir model hata verirse `errorCount` artar; kritik eşik (3 hata) aşılırsa oturum otomatik durdurulur.
- **Cross-Model Discussion:** Birden fazla modelin aynı konu üzerinde fikir teatisi yapması.
- **Görev Odaklı Çalışma (Goals):** Her oturum belirli bir amaca hizmet eder (`explain`, `research`, `create_learning_candidate`, `debug_error` vb.).
- **Learning Loop:** AI Lab çıktıları, Nano'nun eğitimi için `Learning Candidate` olarak sisteme beslenebilir.
- **Nano Cognitive Reflection:** Nano artık AI Lab'de Orkestratör ve Kalite Kontrol (QC) rolündedir. Her adımda modeli okur, hata olup olmadığını (timeout, degraded, fetch failed) teşhis eder ve hatalı içeriklerden asla öğrenme adayı üretmez.
- **Gemma Integration:** Gemma 4 E4B, AI Lab'de hızlı analiz katılımcısı olarak yer alır. GGUF formatında çalıştırılması (llama.cpp) hız için önerilir. Qwen'in ağır ve yavaş kaldığı durumlarda süreci hızlandırmak için tasarlanmıştır.

### Gemma GGUF Runtime Kontrolü
Gemma yerel GGUF runtime için beklenen dosyalar:

- Model: `C:\aillame-models\gguf\gemma-4-E4B-it-Q4_K_M.gguf`
- Server: `C:\aillame-llama\llama-server.exe`
- Endpoint: `http://127.0.0.1:8080/v1/chat/completions`

Otomatik başlatma için `.env` ayarları:

```env
AILLAME_GEMMA_ENABLED=true
AILLAME_GEMMA_AUTO_START=true
AILLAME_GEMMA_START_ON_APP_BOOT=true
AILLAME_GEMMA_SERVER_URL=http://127.0.0.1:8080
AILLAME_GEMMA_LLAMA_SERVER_EXE=C:\aillame-llama\llama-server.exe
AILLAME_GEMMA_MODEL_PATH=C:\aillame-models\gguf\gemma-4-E4B-it-Q4_K_M.gguf
AILLAME_GEMMA_PORT=8080
AILLAME_GEMMA_CONTEXT_SIZE=8192
AILLAME_GEMMA_STARTUP_TIMEOUT_MS=60000
AILLAME_GEMMA_TIMEOUT_MS=60000
```

Aillame Gemma çağrısından önce `http://127.0.0.1:8080/v1/models` ve gerekirse `/health` kontrolü yapar. Server kapalıysa tek bir arka plan başlatma işlemi yürütülür; eşzamanlı istekler aynı başlatma sonucunu bekler. Başlatma başarısız olursa AI Lab `degraded` mesajı üretir ve Nano final summary ile oturumu güvenli kapatır.

Runtime status:

```powershell
curl.exe "http://localhost:3000/api/core/gemma-runtime/status"
```

Manuel başlatma:

```powershell
cd C:\aillame-llama
.\llama-server.exe -m "C:\aillame-models\gguf\gemma-4-E4B-it-Q4_K_M.gguf" --port 8080 -c 8192
```

Kontrol:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
Invoke-RestMethod http://127.0.0.1:8080/v1/models
```

Direkt llama-server chat testi:

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

Aillame API testi:

```powershell
$body = @{ prompt = "Türkçe eş anlamlı kelimelerden 5 örnek ver." } | ConvertTo-Json -Compress
$body | Set-Content -Path "$env:TEMP\gemma-test.json" -Encoding utf8
curl.exe -X POST "http://localhost:3000/api/core/gemma-chat" `
  -H "Content-Type: application/json; charset=utf-8" `
  --data-binary "@$env:TEMP\gemma-test.json"
```

PowerShell'de tek satır `curl --data-raw` JSON ve `^` satır devam karakteri gövdeyi bozabilir. `Invoke-RestMethod | ConvertTo-Json` çıktısı da bazı terminallerde Türkçe karakter görüntüsünü yanıltabilir; gerçek karar için `curl.exe --data-binary`, Node `fetch` veya tarayıcı Network response tercih edilmelidir.

AI Lab testi: `goal=explain`, participants `nano + gemma`. Server kapalı, timeout veya boş yanıt durumlarında Gemma `degraded` döner; aynı oturumda tekrar denenmez ve Nano güvenli final summary üretir.


## 3. Öğrenme Güvenliği

AI Lab çıktıları doğrudan eğitime girmez. Şu aşamalardan geçer:
1. **Candidate:** Otomatik oluşturulan eğitim adayı.
2. **Validator:** Bozuk çıktı, sır sızıntısı veya yüksek risk kontrolü.
3. **Admin Onayı:** Eğitici verinin kalitesinin manuel teyidi.

## 4. Mevcut Durum (MVP+)
- **Nano:** Active (Local)
- **Gemma 4 E4B:** Active (Fast Local - GGUF / Transformers)
- **Qwen3-VL 8B:** Optional / Active (Deep Vision Analysis - Heavy Python Runtime)
- **Qwen3-VL 4B:** Planned (Gelecekteki hafif fast-vision adayı, henüz indirilmedi)
- **SDXL:** Active (Python Diffusers / Planning Fallback)
- **Gemini:** Planning Only / Planned

---

### Visual Generation & Prompt Library
AI Lab içinde SDXL tarafından üretilen görseller, modelin görselleştirme yeteneklerini test eder. Üretilen yüksek kaliteli promptlar, ileride Nano'nun multimodal yeteneklerini geliştirmek için bir **Prompt Library** adayı olarak kaydedilebilir. 

**Güvenlik Notu:** Görsel üretim çıktıları doğrudan Nano'nun metin tabanlı eğitim setine dahil edilmez; sadece görsel-metin eşleşmesi (prompt-to-image) veri kümesi için aday olabilir.

---

**Not:** Qwen, Nano modelini doğrudan eğitmez. Qwen'den gelen yüksek kaliteli yanıtlar, `Learning Candidate` pipeline'ı üzerinden admin onayına sunulur ve onaylanan veriler Nano'nun eğitim setine dahil edilir.
