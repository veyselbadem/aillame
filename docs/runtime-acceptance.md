# Aillame Runtime Acceptance & Desktop Readiness

Aillame'in beta/final sürümüne hazır olup olmadığını ölçmek için kullanılan merkezi sistemdir.

## Final Kabul Kriterleri (Acceptance Criteria)
Aillame'in yayınlanabilmesi için şu iki temel yerel motorun aktif ve "üretim yapabilir" durumda olması şarttır:

1. **Live Text Runtime (LLM):**
   - Aillame Nano v1 motoru devrede olmalı.
   - Native modül (`aillame-core-v7.node`) yüklü olmalı.
   - Model checkpoint dosyası mevcut olmalı.
   - Doğrudan metin üretimi (`smoke:live-text-runtime`) başarılı olmalı.

2. **Live Image Runtime (IGM):**
   - Diffusion motoru yapılandırılmış olmalı.
   - `AILLAME_IGM_RUNTIME_ENABLED=true` olmalı.
   - Model ağırlıkları (`.safetensors`) tanımlanmış olmalı.
   - Görsel üretimi (`smoke:live-image-runtime`) başarılı olmalı.

## Desktop Shell Readiness
Masaüstü uygulaması için şu bileşenler izlenir:
- **Local Server Boot:** Sunucunun hangi port ve host üzerinden başlayacağı.
- **Health Bridge:** Desktop shell'in sistemi izlemek için kullandığı API köprüsü.
- **Packaging:** Uygulamanın paketlenmeye (Tauri/Electron) hazır olma durumu.

## Komutlar
```bash
# Metin üretim kabulünü test et
npm run smoke:live-text-runtime

# Görsel üretim kabulünü test et
npm run smoke:live-image-runtime

# Desktop hazır olma durumunu raporla
npm run smoke:desktop-readiness
```

## Beta Engelleyiciler (Blockers)
Eğer yerel motorlardan biri "Not Configured" veya "Failed" durumundaysa, sistem `finalAcceptanceReady: false` döner ve admin panelinde engelleyici sebepler listelenir.
