# Aillame Live Image Runtime & Asset Manager

Aillame, yerel görsel üretim (Image Generation - IGM) süreçlerini profesyonel bir şekilde yönetmenizi sağlar.

## IGM (Image Generation Model) Nedir?
IGM, genellikle Stable Diffusion veya benzeri yerel Diffusion modellerini ifade eder. Aillame, bu modelleri ComfyUI gibi dış arayüzlere ihtiyaç duymadan kendi "Local Worker" kontratı üzerinden yönetebilir.

## Image Asset Manager
Üretilen her görsel bir "Asset" olarak kabul edilir ve şu bilgilerle saklanır:
- **Prompt & Negative Prompt:** Görselin üretim komutları.
- **Model & Runtime Info:** Hangi model ve ayarların kullanıldığı.
- **File Metadata:** Dosya adı, boyutu ve çözünürlük bilgileri.
- **Job ID:** Görselin hangi iş (job) kapsamında üretildiği.

## Image Job Lifecycle
Bir görsel üretim isteği şu aşamalardan geçer:
1. **Queued:** İstek alındı ve sıraya eklendi.
2. **Running:** Yerel worker aktif olarak görseli üretiyor.
3. **Completed:** Görsel başarıyla üretildi ve asset manager'a kaydedildi.
4. **Failed / Degraded:** Hata oluştu veya runtime yapılandırılmadığı için işlem yapılamadı.

## Worker Configuration
Aillame, görsel üretim için bir external process (Python script veya binary) çağırır.
- `AILLAME_IGM_WORKER_COMMAND`: Worker binary veya script yolu (örn: `C:\path\to\python.exe`).
- `AILLAME_IGM_WORKER_ARGS`: Komut satırı argümanları (örn: `src/core/image-generation/scripts/sdxl_generate.py`).
- `AILLAME_IGM_PROTOCOL`: Worker iletişim protokolü. `stream` (stdin/stdout JSON) veya `foundation` (--request/--output flags). Varsayılan: `stream`.
- `AILLAME_IGM_TIMEOUT_MS`: Maksimum üretim süresi (varsayılan 5 dk).

## Final Acceptance Criteria (Final Kabul Kriterleri)
Aillame'in tam sürüm (beta) sayılabilmesi için yerel görsel üretiminin aktif olması zorunludur:
- `AILLAME_IGM_RUNTIME_ENABLED=true` olmalı.
- `AILLAME_IGM_WORKER_COMMAND` geçerli bir worker'ı işaret etmeli.
- `AILLAME_IGM_MODEL_DIR` ve `AILLAME_IGM_ACTIVE_MODEL` geçerli bir `.safetensors` dosyasını işaret etmeli.
- **Dürüst Raporlama:** Placeholder görseller veya sadece env ayarı olması kabul sayılmaz; gerçek bir PNG/JPEG dosyası üretilmelidir.

## Örnek Kurulum (SDXL Python Worker)
```env
AILLAME_IGM_RUNTIME_ENABLED=true
AILLAME_IGM_WORKER_COMMAND=C:\Users\veyse\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe
AILLAME_IGM_WORKER_ARGS=src/core/image-generation/scripts/sdxl_generate.py
AILLAME_IGM_PROTOCOL=stream
AILLAME_IGM_MODEL_DIR=C:\aillame-models\diffusion
AILLAME_IGM_ACTIVE_MODEL=sd_xl_turbo_1.0_fp16.safetensors
```

## Komutlar
```bash
# IGM kabul durumunu raporla
node scripts/smoke-live-image-runtime.mjs

# IGM Model Manager testlerini çalıştır
node scripts/smoke-live-igm-model-manager.mjs
```

## Güvenlik
- Üretilen görseller `.aillame-data/assets/images/` altında saklanır ve git'e eklenmez.
- Prompt içeriğinde API key veya secret tespit edilirse işlem reddedilir.
- Yerel dosya yolları UI ve loglarda sanitize edilir.
