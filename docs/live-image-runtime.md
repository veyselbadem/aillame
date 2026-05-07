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

## Final Acceptance Criteria (Final Kabul Kriterleri)
Aillame'in tam sürüm (beta) sayılabilmesi için yerel görsel üretiminin aktif olması zorunludur:
- `AILLAME_IGM_RUNTIME_ENABLED=true` olmalı.
- Yerel bir model dosyası (`.safetensors` vb.) tanımlanmış olmalı.
- Çıktı klasörü yazılabilir olmalı.

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
