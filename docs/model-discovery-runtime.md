# Aillame Model Discovery & Runtime Guide

Aillame, yerel LLM modellerini keşfetmek ve çalıştırmak için güvenli bir iş akışı sunar.

## Model Keşfi (Discovery)
Aillame, yerel dizinlerdeki veya Hugging Face cache'indeki modelleri tarayabilir. Bu işlem sırasında:
- **GGUF Dedektörü:** Dosya adından modelin quantization ve parametre boyutunu anlar.
- **Metadata Analizi:** Lisans ve güncelleme tarihlerini takip eder.

## Uyumluluk Skorlaması (Compatibility Scoring)
Her model için 0 ile 1 arasında bir skor üretilir:
- **0.7 - 1.0:** Yüksek uyumluluk. Sorunsuz çalışması beklenir.
- **0.4 - 0.7:** Orta uyumluluk. RAM uyarısı veya yavaş çalışma olabilir.
- **0.0 - 0.4:** Düşük uyumluluk. Format dönüşümü gerekebilir veya donanım yetersizdir.

## İzleme Listesi (Watchlist)
Favori modellerinizi watchlist'e ekleyerek:
- Yeni versiyon çıktığında bildirim alabilirsiniz.
- Model metadata'sındaki değişimleri takip edebilirsiniz.

## Güvenli Hazırlık (Safe Install Plan)
Aillame, kullanıcı onayı olmadan hiçbir model dosyasını indirmez veya değiştirmez. Her işlem öncesinde:
- Gerekli disk alanı kontrol edilir.
- Lisans ve hardware riskleri raporlanır.
- Kullanıcıdan explicit onay (Approval) alınır.

## Runtime Readiness
GGUF runtime'ın çalışmaya hazır olup olmadığı şu kriterlerle ölçülür:
- Model dosyası mevcut ve erişilebilir mi?
- GGUF formatı doğrulandı mı?
- Donanım (RAM) yeterli mi?
- Runtime binary'si yapılandırıldı mı?

## Smoke Test
```bash
npm run smoke:model-discovery-runtime
```
