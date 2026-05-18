# Doomsgame Entegrasyon Kontrol Listesi

Bu doküman, Doomsgame Engine'in Aillame API ile başarılı bir şekilde haberleşebilmesi için yapılması gerekenleri listeler.

## 1. Aillame API Kurulumu
- [ ] Proje dizininde `npm install` çalıştırıldı.
- [ ] `.env` dosyası oluşturuldu ve yapılandırıldı.
- [ ] `npm run api:dev` ile sunucu başlatıldı (http://127.0.0.1:3000).

## 2. API Key Yönetimi
- [ ] Doomsgame için anahtar üretildi:
  `npm run api:key:generate doomsgame "Doomsgame Engine" doomsgame-engine`
- [ ] Üretilen anahtarın hash değeri `src/config/api-keys.config.ts` dosyasına eklendi.
- [ ] Doomsgame tarafında `ail_doomsgame_xxx` formatındaki anahtar kaydedildi.

## 3. Bağlantı Testi
- [ ] `GET /api/aillame/health` ile sistemin ayakta olduğu teyit edildi.
- [ ] `POST /api/aillame/integration/doomsgame/test` ile bağlantının hazır olduğu teyit edildi.

## 4. Chat Pipeline Doğrulaması
- [ ] `AILLAME_CHAT_USE_RUNTIME=false` iken mock cevap alınabiliyor.
- [ ] `AILLAME_CHAT_USE_RUNTIME=true` iken model dosyası varsa gerçek cevap alınabiliyor.
- [ ] Model dosyası yoksa `MODEL_FILE_MISSING` hatası veya mock fallback davranışı kontrol edildi.

## 5. Güvenlik ve Hafıza
- [ ] `safety.canAutoApply` değerinin her zaman `false` olduğu teyit edildi.
- [ ] Mesajların `recentMessages` listesine eklendiği `memory/:projectId/context` üzerinden doğrulandı.

## Doomsgame Ayarları İçin Özet:
- **API URL**: `http://127.0.0.1:3000`
- **Project ID**: `doomsgame-engine`
- **Default Mode**: `code`
