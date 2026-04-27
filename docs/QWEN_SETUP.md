# Qwen3-VL 8B Kurulum Rehberi

Aillame AI Lab'de Qwen modelinin gerçek zamanlı (inference) çalışabilmesi için bir Python çalışma zamanı ve gerekli kütüphanelerin yüklü olması gerekir. Eğer bu kurulum tamamlanmazsa, Qwen "Planning Mode" (fallback) ile çalışmaya devam eder.

## 1. Python Gereksinimleri

Aillame, Qwen modelini çalıştırmak için Python 3.10+ sürümüne ihtiyaç duyar.

### Ortamın Hazırlanması
Bağımsız bir virtual environment (venv) kullanmanız önerilir:

```bash
# Sanal ortam oluştur
python -m venv .venv-aillame

# Aktif et (Windows)
.venv-aillame\Scripts\activate
```

### Gerekli Paketlerin Yüklenmesi
Qwen3-VL-8B için `torch` ve `transformers` paketleri gereklidir:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install transformers accelerate pillow qwen-vl-utils
```

## 2. Aillame Yapılandırması (.env)

Projenin kök dizinindeki `.env` dosyasına Python yolunu ekleyin:

```env
AILLAME_PYTHON=C:\proje-yolu\.venv-aillame\Scripts\python.exe
```

## 3. Model Dosyaları

Qwen3-VL-8B modeli yaklaşık 16GB disk alanı gerektirir. İlk çalıştırmada Hugging Face üzerinden otomatik olarak indirilir.

**Önemli:** Model dosyaları varsayılan olarak şu dizine iner:
`%USERPROFILE%\.cache\huggingface\hub\models--Qwen--Qwen3-VL-8B-Instruct`

Eğer bu alanı değiştirmek isterseniz `HF_HOME` ortam değişkenini ayarlayabilirsiniz.

## 4. Hızlı Kontrol Komutları

Kurulumun doğruluğunu terminalden test edebilirsiniz:

```powershell
# Python yolu doğru mu?
Test-Path "C:\path\to\python.exe"

# Paketler yüklü mü?
& "C:\path\to\python.exe" -c "import torch; import transformers; print('Hazır')"
```

## 5. Sorun Giderme

- **"Model or Runtime not ready" Hatası**: Genelde `AILLAME_PYTHON` yolunun yanlış olması veya CUDA uyumsuzluğundan kaynaklanır.
- **Yüksek RAM Kullanımı**: 8B modeli için en az 16GB RAM (veya 8GB+ VRAM) önerilir.
- **Cuda Hatası**: GPU kullanıyorsanız `torch` sürümünün CUDA sürümünüzle uyumlu olduğundan emin olun.

## 6. Bellek ve Performans (os error 1455)

Qwen3-VL 8B modeli yaklaşık 16GB RAM/VRAM gerektirir. Sisteminizde 24GB RAM olsa dahi, Windows sanal bellek (pagefile) yetersizliği nedeniyle `os error 1455` hatası alabilirsiniz.

### Sanal Bellek Önerisi (Pagefile)
Eğer hata alıyorsanız şu ayarları yapmanız önerilir:
1.  **Sistem Özellikleri** > **Gelişmiş sistem ayarları**
2.  **Performans** > **Ayarlar** > **Gelişmiş** sekmesi
3.  **Sanal Bellek** > **Değiştir**
4.  C: sürücüsü için **Özel boyut** seçin:
    *   **Başlangıç boyutu:** 32768 MB (32GB)
    *   **En büyük boyut:** 65536 MB
5.  **Ayarla** ve **Tamam** diyerek bilgisayarı yeniden başlatın.

### Smoke Test Komutu
Kurulumu şu komutla test edebilirsiniz:
```powershell
$input = @{ modelId = "Qwen/Qwen3-VL-8B-Instruct"; prompt = "Merhaba"; maxNewTokens = 20 } | ConvertTo-Json; echo $input | python src/core/inference/scripts/qwen3_vl_infer.py
```

---
*Aillame Core Alpha - AI Lab Orchestration*
