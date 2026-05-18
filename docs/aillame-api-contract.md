# Aillame API Sözleşmesi

Aillame, yerel olarak çalışan ve dış dünyaya (özellikle Doomsgame Engine) AI hizmeti sunan bağımsız bir API sunucusudur.

## Genel Bilgiler

- **Varsayılan Base URL**: `http://127.0.0.1:3000`
- **İçerik Tipi**: `application/json`
- **Kimlik Doğrulama**: Tüm korumalı isteklere `x-aillame-api-key` header'ı eklenmelidir.

## Endpoint Listesi

### 1. Public Endpointler

#### Health Check
`GET /api/aillame/health`
Sistemin çalışıp çalışmadığını kontrol eder.

### 2. Korumalı Endpointler

Header zorunlu: `x-aillame-api-key: ail_xxx`

#### Auth Test
`GET /api/aillame/auth/test`
API anahtarının geçerliliğini kontrol eder.

#### Chat (Ana Endpoint)
`POST /api/aillame/chat`
Yapay zeka ile konuşma başlatır.

**İstek Örneği:**
```json
{
  "projectId": "doomsgame-engine",
  "mode": "code",
  "message": "Bu dosyayı analiz et.",
  "context": {
    "taskType": "code_review",
    "source": "doomsgame-engine",
    "files": [
      {
        "path": "src/App.tsx",
        "language": "tsx",
        "content": "..."
      }
    ]
  }
}
```

**Başarılı Yanıt Örneği:**
```json
{
  "success": true,
  "answer": "...",
  "summary": "...",
  "projectId": "doomsgame-engine",
  "mode": "code",
  "model": { "provider": "aillame-local", "name": "aillame-code-small" },
  "suggestedFiles": [],
  "steps": [],
  "warnings": [],
  "safety": {
    "requiresUserApproval": true,
    "canAutoApply": false,
    "riskLevel": "medium",
    "issues": []
  },
  "meta": { "requestId": "chat_xxx", "mock": false, "runtime": { "used": true } }
}
```

#### Entegrasyon Testi
`POST /api/aillame/integration/doomsgame/test`
Doomsgame Engine bağlantısının tam olarak hazır olup olmadığını kontrol eder.

#### Hafıza Bağlamı
`GET /api/aillame/memory/:projectId/context`
Projenin mevcut hafıza durumunu döner.

## Hata Formatı

Hata durumlarında (4xx, 5xx) şu formatta yanıt dönülür:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Hata açıklaması"
  }
}
```

### Yaygın Hata Kodları:
- `MISSING_API_KEY`: Header eksik.
- `INVALID_API_KEY`: Key geçersiz.
- `PROJECT_KEY_MISMATCH`: Key bu proje için yetkili değil.
- `MODEL_FILE_MISSING`: GGUF model dosyası bulunamadı.
- `RUNTIME_TIMEOUT`: İşlem süresi aşıldı.
