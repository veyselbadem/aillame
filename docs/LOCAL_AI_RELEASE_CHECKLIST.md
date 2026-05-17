# Aillame Local AI Release Checklist (Sürüm Hazırlığı ve Kalite Güvence Kılavuzu)

Bu doküman, **Aillame** masaüstü uygulamasının yerel yapay zeka (Local AI) mimarisinin genel sürüm öncesi kararlılık, güvenlik ve entegrasyon kontrol listesini (Release Checklist), test adımlarını ve bilinen sınırlamaları detaylandırmaktadır.

---

## 1. Genel Mimari Özeti

Aillame, yerel kaynaklarda minimum yük ve maksimum güvenlik ile çalışan entegre bir yapay zeka ekosistemidir:

*   **Aillame Nano:** Merkezi bilişsel yönlendirici (Cognitive Router), metin asistanı ve görev orkestratörüdür.
*   **Qwen3-VL 4B Vision:** Görsel anlama ve OCR yeteneklerini donanım limitli SafeRuntime katmanında barındırır.
*   **SDXL Turbo:** Güvenli çalışma zamanı (SafeRuntime) ve donanım singleton kilidi (GPU Heavy Lock) ile kilitli görsel üretim sağlar.
*   **Yerel Hafıza (Memory) & Proje Bağlamı (Workspace Context):** Tamamen yerel JSON depolarında atomik dosya yazımı ve hata toleransı ile çalışır.
*   **Distillation Dataset:** Kullanıcı kontrollü, onay tabanlı, hassas veri maskelemeli yerel distillation veri toplama altyapısıdır.

---

## 2. Model Rolleri ve Dağılım Matrisi

Sistemdeki yönlendirmeler prompt içeriğine ve dosya eklerine göre aşağıdaki gibi dağıtılmaktadır:

| İstek Türü / Niyet | Tetiklenen Model / Servis | UI Durum Mesajı | Kullanılan Bilişsel Niyet |
| :--- | :--- | :--- | :--- |
| **Metin Sohbeti** | Aillame Nano (`aillame-nano-v1`) | `"Aillame Nano yanıt hazırlıyor"` | `text_chat` |
| **Görsel Analizi / OCR** | Qwen3-VL 4B (`qwen3-vl-4b`) | `"Qwen3-VL 4B görseli analiz ediyor"` | `vision_chat` |
| **Görsel Üretimi** | SDXL Turbo | `"SDXL Turbo görsel üretimi hazırlanıyor"` | `image_generation` |
| **Sistem Durumu / Teşhis**| Nano Lab (`system.health`) | `"Nano Lab sağlık kontrolü hazırlanıyor"` | `health_check` |
| **Belirsiz Giriş** | Aillame Nano Netleştirici | `"Aillame Nano isteği netleştiriyor"` | `unknown` |
| **Hafıza Sorgusu** | Aillame Hafıza Arama | Yok (Prompt Enjeksiyonu) | `tool_use: memory.search` |
| **Proje Sorgusu** | Proje Bağlamı Arama | Yok (Prompt Enjeksiyonu) | `tool_use: project.active` |
| **Öğrenme Verisi İstatistik**| Distillation İstatistikleri | Yok (Sohbet İçi Rapor) | `tool_use: distillation.stats` |

---

## 3. Güvenlik Sınırları ve Regresyon Filtresi

Aillame Nano, yerel sistem güvenliği gereği serbest komut (shell/PowerShell/CMD) çalıştırma, gizli dosya okuma veya token/şifre gösterme işlemlerini desteklemez. Central Safety Shield aşağıdaki prompt tiplerini anında bloke eder:

*   **Zararlı Komutlar / Exploitler:** `powershell`, `cmd.exe`, `rm -rf`, `format`, `del /s`
*   **Hassas Dosya Sızıntıları:** `env dosyamı göster`, `.env oku`, `credentials.json`, `passwd`
*   **Hassas Bilgilerin Hafıza/Dataset Kaydı:** API Key sızıntısı (`sk-proj-...`), şifre yazımı, kredi kartı ekleme.
*   **Reaksiyon:** Güvenli Türkçe reddetme mesajı (`Bu işlem güvenlik nedeniyle engellendi...`), model kimliği `aillame-nano-v1-tool-blocked` olarak işaretlenir ve hiçbir yerel yazma/çalıştırma işlemi tetiklenmez.

---

## 4. Desteklenen Endpointler ve Canlı Durum Matrisi

| Endpoint | HTTP Metodu | Beklenen Yanıt Tipi / Başarı Kriteri | Durum |
| :--- | :--- | :--- | :--- |
| `/api/models` | GET | Aktif/İnaktif model listesi ve durumları | 🟢 ÇALIŞIYOR |
| `/api/aillame/vision/health` | GET | Qwen3-VL dosyaları, GPU Lock ve preflight durumları | 🟢 ÇALIŞIYOR |
| `/api/aillame/vision/mini-test` | POST | SafeRuntime limitlerine göre dryRun veya preflight kontrolü | 🟢 ÇALIŞIYOR |
| `/api/image-generation?dryRun=true` | POST | SDXL Turbo kilit ve GPU preflight testi | 🟢 ÇALIŞIYOR |
| `/api/aillame/memory` | GET | Kayıtlı yerel bellek kartlarının listesi | 🟢 ÇALIŞIYOR |
| `/api/aillame/projects` | GET | Tanımlı çalışma alanı (workspace) bağlamları | 🟢 ÇALIŞIYOR |
| `/api/aillame/projects/active` | GET/POST | Aktif seçili proje ve proje detayları | 🟢 ÇALIŞIYOR |
| `/api/aillame/distillation/dataset` | GET/POST/DELETE | Onaylı veri setleri listeleme, ekleme ve silme | 🟢 ÇALIŞIYOR |
| `/api/aillame/distillation/dataset/stats` | GET | Kayıtların kategorize edilmiş istatistik tablosu | 🟢 ÇALIŞIYOR |
| `/api/aillame/distillation/dataset/export`| GET | `application/x-jsonlines` formatında güvenli indirme | 🟢 ÇALIŞIYOR |
| `/api/aillame/tools/run` | POST | `models.status`, `system.health` vb. araçların yürütümü | 🟢 ÇALIŞIYOR |
| `/api/core/chat` | POST | Bilişsel entegre sohbet ve orkestrasyon katmanı | 🟢 ÇALIŞIYOR |

---

## 5. Çalıştırılacak Test Protokolü (Doğrulama Komutları)

Sürüm öncesi donanım üzerinde sırasıyla şu testler çalıştırılmalıdır:

```bash
# 1. Kod standartları ve TypeScript doğrulaması
npm run typecheck

# 2. Next.js üretim derlemesi kontrolü
npm run build

# 3. Yerel Hafıza Testi
npx tsx scripts/smoke-phase6.1-memory-system-validation.ts

# 4. Güvenli Araç Kullanımı Testi
npx tsx scripts/smoke-phase7-tool-use-validation.ts

# 5. Multimodal Vision & Image Preflight Testleri
npx tsx scripts/smoke-phase7.1-all-validations.ts

# 6. Proje Bağlamı Testi
npx tsx scripts/smoke-phase8.1-project-context-validation.ts

# 7. Yerel Öğrenme Verisi / Distillation Testi
npx tsx scripts/smoke-phase9-distillation-dataset-validation.ts
```

---

## 6. Sürüm Öncesi Kontrol Listesi (Pre-release Checklist)

*   [x] **TypeScript & Derleme:** `npm run typecheck` sıfır hata ile geçiyor, `npm run build` production paketi başarıyla derleniyor.
*   [x] **Tüm Dışlanmış Modeller:** `Qwen2.5 0.5B`, `Qwen3-VL 8B`, `Gemma 26B`, `Gemma E4B`, `Ollama Qwen3.5` modelleri sistem envanterinden ve registry'den kalıcı olarak çıkarılmış, arayüzde görünmüyor.
*   [x] **Model Dosyaları Bütünlüğü:** `C:\Aillame\Models\nano\qwen3-vl-4b\` altındaki `model.gguf` ve `mmproj.gguf` dosyaları mevcut ve geçerli GGUF formatına sahip.
*   [x] **Storage Dosyaları Sağlığı:** JSON dosyalarında herhangi bir bozulma yok. Bozulma durumunda self-healing mekanizmasının `.corrupted` yedeği alıp veritabanını sıfırlayarak kurtardığı smoke testle doğrulanmış.
*   [x] **Kişisel / Hassas Veri Sızıntısı:** `.aillame-data` altındaki depolarda ham şifre, token veya kredi kartı bilgisi yer almıyor, filtreler aktif.
*   [x] **Dokümantasyon Güncelliği:** Mimari, hafıza, araçlar, proje bağlamları ve distillation kılavuzları son stabil güncellemelere göre revize edilmiş.
*   [x] **Otomatik Veri Kaydı Kontrolü:** Sohbet sırasında arka planda izinsiz veya otomatik dataset/hafıza kaydı yapılmıyor; yalnızca suggest nesnesi transient olarak hazırlanıyor.

---

## 7. Bilinen Sınırlamalar (Limitations & Constraints)

1.  **Development Ortamı Mini-Test Sınırlaması:** Geliştirme ortamında (Development) mini görsel test gerçek GGUF VLM inference çalıştırmak yerine `dryRun` döner. Gerçek test için `NODE_ENV=production` veya `AILLAME_ALLOW_DEV_NATIVE_INFERENCE=true` ayarlanmalıdır.
2.  **SDXL Turbo Sınırlaması:** Görsel üretim runtime’ı kapalıysa veya laptopta asgari **8000 MB RAM** ve **6500 MB Boş VRAM** sağlanamıyorsa preflight engeli tetiklenir ve işlem durdurulur.
3.  **Local Distillation Sınırı:** Bu altyapı yerel bilgisayarda model eğitimi başlatmaz. Yalnızca ileride kullanılmak üzere kullanıcı onaylı ve maskelenmiş JSONL öğrenme seti hazırlar.
4.  **Araç Sınırlamaları:** Tool-use sistemi tamamen read-only güvenli araçlarla (`models.status`, `system.health`, `project.docs`, `distillation.stats` vb.) sınırlıdır; dosya silme, taşıma, değiştirme veya serbest shell komut çalıştırma yetkisi kesinlikle yoktur.

---

## 8. Sürüm Notları Taslağı (Release Notes Draft)

### Aillame Local AI Foundation Sürüm v1.4.0

Aillame masaüstü uygulamasının yerel ve güvenli AI motoru kararlı genel sürüme hazır!

#### 🎉 Yeni Özellikler ve Geliştirmeler:
*   **Aillame Nano Bilişsel Yönlendirici (v1/v2):** Türkçe stem-matching analizörlü akıllı yönlendirmeyle metin, görsel analiz ve resim üretme isteklerini milisaniyeler içinde çözer.
*   **Qwen3-VL 4B Multimodal Vision:** Yerel GGUF ve mmproj entegrasyonuyla hızlı ve gizli görsel yorumlama.
*   **SafeRuntime ve GPU Heavy Lock:** HP Omen donanımını koruyan kaynak preflight kontrolü ve singleton GPU işlem kilidi.
*   **Yerel Hafıza ve Proje Bağlamı:** Çalışma alanlarınıza özel bağlam oluşturma, otomatik prompt enjeksiyonu ve self-healing JSON depolama.
*   **Local Distillation Dataset:** Kullanıcı onayına tabi, hassas veri maskelemeli, arama ve indirme (export) destekli Türkçe model öğrenme veri seti hazırlığı.
*   **Central Safety Shield:** Exploit, serbest kod çalıştırma ve hassas veri sızıntılarına karşı tam zırhlı Türkçe koruma kalkanı.

---

## 10. Tauri Desktop Packaging (Masaüstü Paketleme ve Release)

Aillame masaüstü uygulamasının Tauri v2 production derleme ve paketleme (packaging) denetimi başarıyla tamamlanmış ve kararlı installer paketleri üretilmiştir:

### A) Paketleme Sonuçları (Release Artifacts)
*   **MSI Installer:** `src-tauri\target\release\bundle\msi\Aillame_1.3.0_x64_en-US.msi` (~4.2 MB)
*   **NSIS Setup EXE:** `src-tauri\target\release\bundle\nsis\Aillame_1.3.0_x64-setup.exe` (~2.7 MB)
*   **Hafiflik Kriteri:** Büyük model dosyaları (GGUF, mmproj, safetensors) bundle içine gömülmeyip dış local path'lerden (`C:\Aillame\Models\...`) yüklendiği için installer boyutları son derece hafiftir.

### B) Desktop Derleme Adımları
```powershell
# 1. Desktop hazırlık ve köprü smoke testlerinin çalıştırılması
node scripts/smoke-desktop-readiness.mjs

# 2. Tauri build komutunun yürütülmesi
npx tauri build
```

### C) Tauri Güvenlik Sınırları (Least Privilege)
*   Serbest shell (cmd, powershell) çalıştırma yetkisi **tamamen kapalıdır**. Sadece sidecar `aillame-runtime` binary'sine `shell:allow-execute` izni verilmiştir.
*   Dosya sistemi izinleri dialog nesneleri ve canonical yerel storage `.aillame-data` alanı ile sınırlandırılmıştır.

### D) Sürüm Geri Alma (Tauri Rollback Planı)
1.  Eğer installer derleme aşamasında `"icon"` hatası alınırsa, `tauri.conf.json` içindeki `"icon"` array'inin `["icons/icon.ico", "icons/icon.png"]` olarak yapılandırıldığından emin olun.
2.  Geliştirme portu çakışırsa `npm run ensure-desktop-dev-free.mjs` ve `npm run ensure-dev-port-free.mjs` scriptlerini çalıştırın.

### E) Canlı Kurulum ve Kaldırma Doğrulaması (E2E Verification)
*   **Sessiz Kurulum (Silent Install):** `Aillame_1.3.0_x64-setup.exe /S` komutuyla sorunsuz kurulmuş ve `C:\Users\<username>\AppData\Local\Aillame\aillame.exe` dizini ile masaüstü kısayolu oluşturulmuştur.
*   **İlk Açılış Doğrulaması:** `aillame.exe` süreci başlatılmış ve arka planda dynamic library link hatası vermeden kararlı şekilde çalıştığı doğrulanmıştır.
*   **Sessiz Kaldırma (Silent Uninstall):** `uninstall.exe /S` komutuyla kısayollar dahil tüm binary dosyalar silinmiştir.
*   **Veri Koruma Güvencesi:** Kaldırma sonrasında yerel `.aillame-data` verileri ve `C:\Aillame\Models` altındaki büyük modeller tamamen korunmuştur.

---

## Sürüm Notu ve Gelecek Sürüm Yol Haritası
*   Sonraki sürüm planları, hotfix politikaları ve minor `v1.4.0` aday özellikleri için lütfen [ROADMAP.md](file:///c:/Users/veyse/OneDrive/Desktop/çalışmalar/aillame/docs/ROADMAP.md) dosyasına bakınız.



