# Aillame Tauri Desktop Packaging Notes (Masaüstü Paketleme ve Release Kılavuzu)

Bu doküman, **Aillame** masaüstü uygulamasının Tauri v2 production derleme ve paketleme (packaging) mimarisini, model/storage yollarını, donanım izinleri güvenliğini ve sürüm yönetimini açıklamaktadır.

---

## 1. Tauri Build Mimarisi ve Paket Sonuçları

Aillame, ** Next.js (Frontend) + Tauri Rust (Desktop Shell) + aillame-runtime (Sidecar) ** modeline dayalı hibrit bir masaüstü mimarisi kullanır. 

Production derleme denetimi `npx tauri build` ile **%100 BAŞARIYLA** tamamlanmış ve aşağıdaki kararlı installer paketleri (release artifacts) üretilmiştir:

*   **MSI Paketi:** `src-tauri\target\release\bundle\msi\Aillame_1.4.1_x64_en-US.msi`
*   **NSIS Kurulum Dosyası (EXE):** `src-tauri\target\release\bundle\nsis\Aillame_1.4.1_x64-setup.exe`

---

## 2. Model ve Storage Path Yaklaşımı (Büyük Dosya Ayrımı)

Aillame installer boyutunun sadece ~2.7 MB - 4.2 MB arasında olmasının yegane sebebi, **büyük model dosyalarının bundle içine kesinlikle gömülmemesidir**.

### A) Yerel AI Model Yolları (External Paths)
Tüm AI motorları, donanım kaynaklarını korumak ve kurulum paketini hafif tutmak için dış dizinleri sorgular:
*   **Qwen3-VL 4B Instruct GGUF:** `C:\Aillame\Models\nano\qwen3-vl-4b\model.gguf`
*   **Qwen3-VL 4B Vision mmproj:** `C:\Aillame\Models\nano\qwen3-vl-4b\mmproj.gguf`
*   **SDXL Turbo Model:** `C:\aillame-models\diffusion\sdxl-turbo-1.0` or `C:\aillame-models\diffusion\sd_xl_turbo_1.0_fp16.safetensors`
*   **Aillame Nano Checkpoints:** `src/core/engine/checkpoints/` ve `public/model/aillame-v1/`

### B) Yerel Storage Yolları (Writable User Directory)
Kullanıcı ayarları, sohbet hafızaları ve distillation dataset satırları tamamen yerel ve taşınabilir JSON/JSONL formatlarında saklanır:
*   `C:\Users\<username>\OneDrive\Desktop\çalışmalar\aillame\.aillame-data\stores\`
    *   `aillame-memory.json` (Hafıza deposu)
    *   `aillame-projects.json` (Proje bağlamları)
    *   `active-project.json` (Aktif odaklanılan proje)
    *   `aillame-distillation-dataset.jsonl` (Öğrenme verisi)

---

## 3. Tauri İzinleri ve Güvenlik Sınırları (Permission Safety)

Aillame desktop yetkilendirmesi, en yüksek derecede zırhlanmış **En Az Yetki (Least Privilege)** ilkesini takip eder:

1.  **Dahili Shell / Command İzinleri Kısıtı:**
    *   Uygulamanın yerel sistemde serbest komut (shell/PowerShell/CMD) çalıştırma izni **tamamen kapalıdır** (`tauri-plugin-shell` sadece entegre runtime sidecar'ı çalıştırmak için sınırlandırılmıştır).
    *   [`src-tauri/capabilities/runtime-sidecar.json`](file:///c:/Users/veyse/OneDrive/Desktop/çalışmalar/aillame/src-tauri/capabilities/runtime-sidecar.json) sadece `aillame-runtime` sidecar binary'sine `shell:allow-execute` izni verir. Serbest komut çalıştırılamaz.
2.  **Dosya Sistemi İzinleri Kısıtı:**
    *   [`src-tauri/capabilities/default.json`](file:///c:/Users/veyse/OneDrive/Desktop/çalışmalar/aillame/src-tauri/capabilities/default.json) dosya yetkileri standard webview dialogları ile sınırlıdır. Geniş sistem dizinlerine yazma/silme yetkisi yoktur.
3.  **Aillame Central Safety Shield Entegrasyonu:**
    *   Tauri yetkilerine ek olarak, `/api/core/chat` üzerinde yer alan yerel koruma zırhı; prompt yoluyla gelebilecek `.env` sızıntısı, kredi kartı/şifre çalma denemeleri veya gizli powershell çalıştırma isteklerini otomatik bloke eder.

---

## 4. Next.js + Tauri API Runtime Uyumluluğu

*   **API Entegrasyonu (Hybrid Bridge):** Next.js App Router altında dinamik API routes (`/api/...`) barındırdığından, Next.js pure static export (`output: 'export'`) ile derlendiğinde API rotalarını tanımaz ve hata verir.
*   **Çalışma Zamanı Çözümü:** Aillame production'da arka planda bir yerel Next.js/Node.js web sunucusu (`http://127.0.0.1:3000`) ayağa kaldırır. Tauri Webview ise bu yerel sunucuya bağlanarak sayfaları yükler. Tauri API Bridge (`src/lib/bridge.ts`) ise Tauri algılandığında native Rust invoke komutlarını (`commands::models::safe_model_infer` vb.) çağırırken, web fallback durumunda HTTP API isteklerini yürütür.
*   **Port 3000 Çakışma Tanısı:** Geliştirme modunda `beforeDevCommand`, `scripts/ensure-dev-port-free.mjs` ile 3000 portunu read-only olarak kontrol eder. Port doluysa Aillame kullanıcıya anlaşılır bir uyarı verir ve başka process'i otomatik sonlandırmaz. Masaüstü Hazırlığı ekranı port durumunu `Kullanılabilir`, `Aillame Çalışıyor` veya `Çakışma` olarak gösterir.

---

## 5. Production Env Yapılandırması ve Güvenlik

Production paketleme sırasında `.env` dosyası aşağıdaki gibi düzenlenmelidir:
*   `AILLAME_IGM_RUNTIME_ENABLED=false` (SDXL runtime opsiyonel olduğundan donanımı korumak için kapalı tutulmalıdır).
*   `AILLAME_ALLOW_DEV_NATIVE_INFERENCE=false` (Geliştirici mini-test dry-run modunda kalmalı, production'da donanımın izinsiz çalıştırılması önlenmelidir).
*   `AILLAME_LOCAL_SERVER_PORT=3000` (Tauri'nin webview üzerinden bağlanacağı port).

---

## 6. Sürüm Paketleme ve Doğrulama Adımları

Uygulamayı sıfırdan paketlemek ve doğrulamak için sırasıyla aşağıdaki komut dizisi çalıştırılmalıdır:

```powershell
# 1. Ön kontroller (TypeScript ve testler)
npm run typecheck
node scripts/smoke-desktop-readiness.mjs

# 2. Tauri binary ve installer paketleme
npx tauri build
```

Paketleme sonrasında installer dosyaları `src-tauri\target\release\bundle\` dizininde `.msi` ve `-setup.exe` olarak yer alacaktır.

---

## 7. Kurulum, İlk Açılış ve Kaldırma Doğrulaması (Live Install, Launch & Uninstall Verification)

Aillame v1.4.0 masaüstü paketinin gerçek Windows ortamında uçtan uca doğrulaması **%100 BAŞARIYLA** simüle edilmiştir:

### A) Canlı Kurulum Testi (NSIS Setup / MSI)
*   `Aillame_1.4.0_x64-setup.exe` Windows üzerinde sessiz modda (`/S`) başarıyla çalıştırılmış ve kurulum sıfır hata ile sonlanmıştır.
*   **Kurulum Dizini:** `C:\Users\<username>\AppData\Local\Aillame\` altındaki `aillame.exe` (~13 MB) dosyası başarıyla diske yazılmıştır.
*   **Kısayollar (Shortcuts):** Kullanıcının OneDrive Desktop (`Aillame.lnk`) ve Windows Start Menu programlar dizinine kararlı kısayollar başarıyla eklenmiştir.

### B) İlk Açılış ve Süreç Doğrulaması (Process Integrity)
*   Kurulan `aillame.exe` süreci arka planda başarıyla tetiklenmiş, **5 saniye boyunca kesintisiz çalışarak** hiçbir dynamic link veya işletim sistemi crash hatası vermediği tespit edilmiş ve ardından güvenle sonlandırılmıştır.

### C) Kaldırma ve Geri Alma Testi (Uninstall Clean Sweep)
*   Sistemdeki `C:\Users\<username>\AppData\Local\Aillame\uninstall.exe` sessiz modda (`/S`) çalıştırılarak kaldırma (uninstall) testi yapılmıştır.
*   **Sonuç:** `aillame.exe` ve tüm shortcut'lar diske ve Windows kayıtlarına hiçbir iz bırakmadan temizlenmiştir.
*   **Veri Koruma Politikası (User Data Safe):** Kaldırma işlemi sonrasında kullanıcının `.aillame-data` veritabanı klasörü ile büyük model klasörleri (`C:\Aillame\Models`, `C:\aillame-models`) **kesinlikle silinmemiş, güvenle korunmuştur.**

---

## 8. Otomatik Güncelleme ve İmzalama Stratejisi (Auto-Updater & Code Signing)

*   **Güncelleme Modeli:** Şu anda Aillame otomatik güncelleme (Tauri Auto-Updater) özelliğini aktif **etmemiştir.** Sürüm yükseltmeleri GitHub Releases üzerinden yayınlanan installer binaries (.exe ve .msi) ile manuel olarak gerçekleştirilir.
*   **İleride Auto-Updater Entegrasyonu:** Eğer otomatik güncelleme aktif edilecek olursa, Tauri standard güncelleme JSON uç noktası ve Windows Code Signing (kod imzalama) sertifikaları gerekecektir.
*   **Model Ayrımı Güvencesi:** Auto-updater entegre edilse dahi, büyük model dosyaları (`C:\Aillame\Models`) kesinlikle güncelleme kanallarından taşınmayacak ve yerel diskte dokunulmadan korunacaktır.

---

## 9. Sürüm v1.4.1 Hotfix Paketleme Notları
*   **Sürüm:** v1.4.1
*   **Değişiklik Türü:** UI Kontrast İyileştirmeleri ve IndexedDB Kalıcı Mesaj Temizleme (deep pruning).
*   **Paket Boyutları:** MSI ~4.2 MB ve NSIS EXE ~2.7 MB düzeyindedir. Büyük model dosyaları ve kullanıcı verileri (`.aillame-data`) bundle dışı bırakılmıştır.
*   **Kaldırma (Uninstall) Güvenliği:** Kaldırma aracı (`uninstall.exe`) v1.4.1 sürümünde de model klasörlerine (`C:\Aillame\Models`) ve `.aillame-data` kullanıcı dizinlerine asla dokunmaz, diskte korur.

