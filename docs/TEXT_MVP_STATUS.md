# Aillame Text MVP Status Report

## 1. Hazır Durumu
Aillame Text MVP, yerel GGUF runtime üzerinden tam fonksiyonel bir şekilde çalışmaktadır. Tüm core servisler (Registry, State, Storage, Inference) derlenmiş modda (compiled mode) stabilize edilmiştir.

## 2. Model Yapılandırması
- **Varsayılan Model**: `Qwen 2.5 0.5B Instruct (Q4_K_M)`
  - Durum: Kayıtlı ve Doğrulanmış
  - Performans: RTX 5060 ile ~100-180 token/s (Ultra Hızlı)
- **Gemma 4 Durumu**: `Installed but Unsupported`
  - Durum: Sistemde yüklü ancak mevcut runtime mimarisi tarafından desteklenmiyor.
  - Davranış: Sistem kilitlenmek yerine "Unsupported Architecture" uyarısı vererek güvenli bir şekilde reddeder.

## 3. Çalıştırma Talimatları

### Startup Scripts (Windows)
- **Aillame API Baslat.bat**: Compiled backend sunucusunu otomatik olarak derler ve başlatır.
- **Aillame Baslat.bat**: Tauri masaüstü uygulamasını geliştirme modunda başlatır.

### Backend (Express API)
```bash
# Backend'i derle
npm run api:build

# API Sunucusunu başlat
node dist/server.js
# veya
npm run api:start
```

### Frontend (Next.js)
```bash
# Geliştirme modu
npm run dev

# Üretim modu (Build & Start)
npm run build
npm run start
```

## 4. Dev Mode vs Production Mode
- **Dev Mode (`npm run dev` / `tsx`)**: Native inference motoru, TSX izleme modunda kilitlenmeleri önlemek için varsayılan olarak devre dışı bırakılabilir (`AILLAME_DISABLE_NATIVE_INFERENCE_IN_DEV=true`).
- **Production/Compiled Mode (`node dist/server.js`)**: Tam performanslı gerçek inference modu. Path alias'lar ve ESM uyumluluğu bu mod için stabilize edilmiştir.

## 5. DevGate ve Güvenlik
- **DevGate**: Sistem, güvenli olmayan veya desteklenmeyen model yüklemelerini engelleyen bir koruma katmanına sahiptir.
- **Path Security**: Model yollarında `..` gibi traversal atakları engellenmektedir.
- **Zero-Trust Metadata**: API yanıtlarında iç hata detayları (stack trace) sızdırılmaz, sadece standart hata kodları döner.

## 6. Test Edilen Endpointler
- `GET /api/aillame/health`: Sistem sağlığı ve runtime durumu.
- `GET /api/aillame/models/active`: Aktif model bilgisi.
- `GET /api/aillame/models/installed`: Kayıtlı modeller listesi.
- `POST /api/aillame/chat`: Gerçek zamanlı LLM inference.

## 7. Donanım ve Performans Yapılandırması (HP OMEN RTX 5060)
- **GPU Hızlandırma**: `AILLAME_USE_GPU=true` (Aktif)
- **GPU Katmanları**: `AILLAME_GPU_LAYERS=32` (Tüm model VRAM'e alınır)
- **Donanım Tespiti**: `/api/aillame/health` endpoint'i üzerinden gerçek CUDA durumu takip edilebilir.
- **CPU Fallback**: GPU hatalarında sistem otomatik olarak CPU moduna geçer (Latency artar ancak servis kesilmez).
- **Zaman Aşımı**: GPU modunda `AILLAME_RUNTIME_TIMEOUT_MS=30000` önerilir.

## 8. Güvenli Kullanım Notları
- **API Key**: Geliştirme aşamasında `default_admin_key` kullanılmaktadır.
- **Gemma 4**: Hâlâ `Unsupported Architecture` olarak işaretlenmiştir; GPU modunda dahi güvenli hata döner.
