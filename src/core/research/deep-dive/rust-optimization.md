# Deep Dive: Rust & Candle Engine Optimization (Phase 2.5)

Bu rapor, Aillame projesinin kalbi olan Rust-native engine (Candle) ve Node.js (N-API) köprüsü üzerindeki performans darboğazlarını ortadan kaldırmak için hazırlanmıştır.

## 1. Donanım Seviyesi Optimizasyon (AVX-512 & bfloat16)

Aillame 8/256 gibi küçük modellerde CPU çıkarım hızı kritiktir. Modern Intel ve AMD (Zen 4+) işlemcilerdeki AVX-512 komut setinden tam yararlanmak için:

### RUSTFLAGS Yapılandırması
Derleme sırasında işlemciye özel optimizasyonları açmak için:
```bash
export RUSTFLAGS="-C target-cpu=native"
cargo build --release
```

### bfloat16 (bf16) Kullanımı
Candle içinde `f32` yerine `bf16` kullanmak, bellek bant genişliğini yarıya indirirken precision kaybını minimize eder. Özellikle eğitim (training) sırasında loss spike'larını önlemek için `f16` yerine `bf16` tercih edilmelidir.

```rust
let dtype = if device.is_cuda() { DType::BF16 } else { DType::F32 };
```

## 2. N-API & Zero-Copy Veri Transferi

JavaScript (TypeScript) ve Rust arasındaki "FFI Boundary" (Sınır) geçişleri pahalıdır.

### Strateji: Buffer Reuse
Her token üretiminde yeni bir String oluşturup JS'e göndermek yerine, Rust tarafında bir `SharedArrayBuffer` (veya Node.js `Buffer`) üzerinde çalışılmalıdır.

```typescript
// TS Tarafı
const outputBuffer = Buffer.allocUnsafe(1024);
aillameCore.generate(input, outputBuffer);
```

### Rayon Entegrasyonu
CPU üzerindeki matris çarpımları için `rayon` thread pool kullanımı Candle tarafından otomatik desteklenir, ancak N-API `async` fonksiyonları ile çakışmaması için `napi::Task` yapısı kullanılmalıdır.

## 3. KV-Cache Optimizasyonu

Çıkarım (inference) hızını artırmak için her adımda tüm bağlamı (context) tekrar hesaplamak yerine, önceki adımların Key-Value çiftleri bellekte tutulmalıdır.

- **Static KV-Cache:** Model yüklenirken maksimum context boyutu kadar yer önceden ayrılmalıdır.
- **Cache Tiling:** Matrislerin L2 cache boyutuna uygun parçalara (tile) bölünerek işlenmesi (Cache blocking) performansı %20-30 artırır.

## 4. Aksiyon Maddeleri

1. [ ] `Cargo.toml` içindeki `candle-core` sürümünü ve özelliklerini kontrol et (`cuda`, `mkl` veya `accelerate` aktif edilmeli).
2. [ ] Tokenizer çıktısını `Vec<u32>` olarak JS'e taşıyıp, decode işlemini gerekirse JS tarafında (Worker thread) yapmayı dene.
3. [ ] `aillame-core` içindeki sıcak döngüleri (hot loops) `criterion` ile benchmark et.
