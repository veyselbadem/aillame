# Deep Dive: Aillame Training Physics & Stability (8/256 Model)

Aillame 8/256 (8 katman, 256 embedding boyutu) "mikro-LLM" sınıfına girer. Bu ölçekteki modellerin eğitimi, devasa modellere göre daha hassastır; çünkü kapasite düşüktür ve en ufak veri kirliliği veya gradyan sapması modeli "körleştirebilir".

## 1. Hiperparametre Optimizasyonu

| Parametre | Önerilen Değer | Neden? |
| :--- | :--- | :--- |
| **Learning Rate (LR)** | 5e-4 to 1e-3 | Küçük modeller daha yüksek LR ile daha hızlı öğrenir ama risklidir. |
| **Warmup Steps** | 2000 - 5000 | Başlangıçtaki rastgele ağırlıkların kararlı hale gelmesi için şarttır. |
| **Weight Decay** | 0.1 | Aşırı öğrenmeyi (overfitting) ve ağırlıkların patlamasını önler. |
| **Gradient Clipping** | 1.0 | Gradyanların 1.0'dan büyük normlarını kırparak kararlılık sağlar. |

## 2. Tokenizer & Sözlük Kararlılığı

Eğitim sırasında "Nöbetçi Hoca" veya canlı öğrenme (live learning) modülleri yeni kelimeler eklerse, modelin sözlüğü (vocabulary) kayar. Bu, modelin tüm öğrendiklerini unutmasına (Catastrophic Forgetting) neden olur.

- **Fixed Vocabulary:** Sözlük eğitimi başlamadan önce dondurulmalıdır.
- **Byte-level BPE:** Tanımlanmamış kelimeler için `<UNK>` üretmek yerine bayt seviyesinde parçalama (Byte-fallback) kullanılmalıdır.

## 3. Loss Spike (Kayıp Sıçraması) Yönetimi

Eğitim sırasında `loss` aniden 10'dan 100'e fırlıyorsa:
1. **Veri Kontrolü:** O adımdaki veri paketinde çok uzun veya anlamsız (junk) karakterler olabilir.
2. **LR Scheduler:** Linear warmup sonrası "Cosine Annealing" (Kosinüs Azalma) kullanılmalıdır. Bu, modelin minima noktasına daha yumuşak inmesini sağlar.

## 4. Küçük Model Mimari Hileleri (Architecture Hacks)

- **Pre-Norm (Normalleştirme Önce):** LayerNorm katmanlarını Attention bloğundan önce koymak eğitimi çok daha kararlı kılar.
- **Rotary Embeddings (RoPE):** Sabit pozisyonel embedding'ler yerine RoPE kullanarak modelin daha uzun metinleri (context) anlaması sağlanabilir.
- **Shared Embeddings:** Giriş (input) ve çıkış (output) ağırlıklarını paylaşarak parametre sayısı %20 azaltılabilir (küçük modeller için verimlidir).

## 5. Canlı Öğrenme (Live Learning) Stratejisi

Modelin eğitimi bittikten sonra yeni bilgilerle beslenmesi için:
- **Low-Rank Adaptation (LoRA):** Ana model dondurulur ve sadece küçük bir "adapter" katmanı eğitilir. Bu, çok hızlıdır ve ana zekayı bozmaz.
- **Experience Replay:** Yeni bilgiler öğretilirken, eski bilgilerden de küçük bir miktar (replay buffer) araya karıştırılmalıdır.
