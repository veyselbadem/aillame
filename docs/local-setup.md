# Aillame Local Setup

## Gereksinimler

- Windows yerel geliştirme ortamı.
- Node.js ve npm güncel LTS sürümü.
- Repo bağımlılıkları için `npm install`.
- Yerel LLM için GGUF model klasörü.
- Yerel LLM worker için `llama-server.exe` path yapılandırması.
- Yerel IGM için model klasörü ve Python virtual environment.

## Kurulum

```powershell
npm install
```

`.env` dosyasını yerelde oluşturun ve asla commit etmeyin. Örnek API key değeri:

```env
AILLAME_API_KEY=YOUR_AILLAME_API_KEY
```

Gerçek token, admin token veya provider key dokümanlara, commitlere ya da loglara yazılmamalıdır.

## LLM model klasörü

GGUF modelleri repo dışında bir klasörde tutulmalıdır. Model dosyaları `.gguf`, `.safetensors`, `.ckpt`, `.bin` veya benzeri büyük artefakt uzantılarıyla git dışında kalır. Runtime config yalnızca seçilen model adını veya sanitize edilmiş durum bilgisini raporlamalıdır.

## llama-server path

Yerel LLM kabul testi `llama-server.exe` erişimini bekler. Path `.env` veya yerel runtime config içinde tutulur. Dokümanlarda gerçek kullanıcı klasörü veya secret path paylaşılmaz.

## IGM model klasörü ve Python venv

IGM worker için Python virtual environment yerelde tutulur. `igm-venv` git dışında kalmalıdır. Model klasörü repo dışında olmalı ve generated görseller commit edilmemelidir.

## CPU fallback

CPU fallback beta kullanımında geçerlidir. Product Health bunu performans uyarısı olarak gösterebilir. Bu durum güvenlik hatası değildir, ancak üretim süresi daha uzun olabilir.

## Aillame nasıl başlatılır

```powershell
npm.cmd run dev
```

Production build doğrulaması:

```powershell
npm.cmd run build
```

## Health nasıl kontrol edilir

Admin Product Health route:

```text
GET /api/admin/product-health
Header: x-aillame-admin-token: YOUR_AILLAME_API_KEY
```

Provider status route:

```text
GET /api/provider/v1/status
Authorization: Bearer YOUR_AILLAME_API_KEY
```

## Örnek endpointler

- `GET /api/provider/v1/status`
- `GET /api/provider/v1/models`
- `POST /api/provider/v1/generate`
- `GET /api/admin/product-health`

## Secret güvenliği

- `.env` ve `.env.local` git dışında kalır.
- Gerçek API key sadece yerel environment içinde tutulur.
- Loglarda token, secret, absolute path ve model path paylaşılmaz.
- Örneklerde yalnızca `YOUR_AILLAME_API_KEY` kullanılır.
