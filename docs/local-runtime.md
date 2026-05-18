# Aillame Local Runtime Dokümantasyonu

Bu doküman, Aillame projesinin yerel LLM (GGUF) çalıştırma altyapısı hakkında teknik bilgiler içerir.

## Mimari Bakış

Aillame, dış servislerden (Ollama, LM Studio vb.) bağımsız çalışacak şekilde kendi runtime katmanına sahiptir. GGUF modellerini doğrudan Node.js ortamında `node-llama-cpp` kütüphanesi kullanarak çalıştırır.

## Yapılandırma (.env)

Gerçek inference işlemini aktif etmek için şu ayarları yapmalısınız:

```env
# Gerçek model çalıştırmayı aktif et
AILLAME_ENABLE_REAL_INFERENCE=true

# Model dosyası varsa ama gerçek inference kapalıysa mock cevap dönsün mü?
AILLAME_ALLOW_RUNTIME_MOCK_FALLBACK=true

# Maksimum bekleme süresi (ms)
AILLAME_RUNTIME_TIMEOUT_MS=60000

# Varsayılan üretim parametreleri
AILLAME_MAX_OUTPUT_TOKENS=512
AILLAME_TEMPERATURE=0.2
```

## Model Dosyaları

Modellerinizi projenin kök dizinindeki `models/` klasörüne yerleştirmelisiniz. Registry içinde tanımlanan path değerleri bu klasöre göre relative (görece) olmalıdır.

Örnek:
`models/aillame-code-small.gguf`

## Endpointler

### 1. Runtime Durumu
`GET /api/aillame/runtime/status`
Sistemin gerçek inference yapmaya hazır olup olmadığını, hangi paketleri kullandığını ve aktif ayarları döner.

### 2. Runtime Testi
`POST /api/aillame/runtime/test`
Prompt Builder, Model Registry ve Local Runtime zincirini uçtan uca test eder. Gerçek model yüklüyse ve aktifse modelden gelen cevabı döner.

## Olası Hatalar ve Anlamları

| Hata Kodu | Açıklama |
|-----------|----------|
| `MODEL_FILE_MISSING` | Belirtilen path üzerinde model dosyası bulunamadı. |
| `RUNTIME_UNAVAILABLE` | GGUF çalıştırma paketi (`node-llama-cpp`) yüklenemedi veya platform uyumlu değil. |
| `RUNTIME_INFERENCE_FAILED` | Model yükleme veya cevap üretme sırasında beklenmedik bir hata oluştu. |
| `RUNTIME_TIMEOUT` | Model yapılandırılan süre içinde cevap üretemedi. |
| `INVALID_MODEL_PATH` | Model yolu güvenlik sınırları dışına çıkıyor (../ içeriyor). |

## Geliştirme Notları

- **Caching**: Modeller ilk istekte belleğe yüklenir ve sonraki isteklerde tekrar kullanılır.
- **Safety**: Her zaman `meta.mock` alanını kontrol ederek cevabın gerçek bir modelden mi yoksa mock katmanından mı geldiğini doğrulayabilirsiniz.
