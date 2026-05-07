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
- `AILLAME_IGM_WORKER_COMMAND`: Worker binary veya script yolu (örn: `python`, `sd-worker.exe`).
- `AILLAME_IGM_WORKER_ARGS`: Komut satırı argümanları.
- `AILLAME_IGM_TIMEOUT_MS`: Maksimum üretim süresi (varsayılan 5 dk).

## Final Acceptance Criteria (Final Kabul Kriterleri)
Aillame'in tam sürüm (beta) sayılabilmesi için yerel görsel üretiminin aktif olması zorunludur:
- `AILLAME_IGM_RUNTIME_ENABLED=true` olmalı.
- `AILLAME_IGM_WORKER_COMMAND` geçerli bir worker'ı işaret etmeli.
- Yerel bir model dosyası (`.safetensors` vb.) tanımlanmış olmalı.
- Çıktı klasörü yazılabilir olmalı.
- **Dürüst Raporlama:** Placeholder görseller veya sadece env ayarı olması kabul sayılmaz; gerçek bir PNG/JPEG dosyası üretilmelidir.

## Komutlar
```bash
# IGM kabul durumunu raporla
npm run smoke:live-image-runtime

# Runtime ve Asset Manager testlerini çalıştır
npm run smoke:image-runtime-assets
```

## Güvenlik
- Üretilen görseller `.aillame-data/assets/images/` altında saklanır ve git'e eklenmez.
- Prompt içeriğinde API key veya secret tespit edilirse işlem reddedilir.
- Yerel dosya yolları UI ve loglarda sanitize edilir.
