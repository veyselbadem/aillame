# Deep Dive: Tauri Multi-Window Orchestration (Hybrid State)

Aillame ve Doomsgame gibi karmaşık masaüstü uygulamalarında, birden fazla pencerenin (Chat, Stats, Settings, Engine Monitor) senkronize çalışması gerekir.

## 1. Rust-Driven Source of Truth (Merkezi Durum)

Tauri'de pencereler arası bellek paylaşımı yoktur. Bu yüzden her pencerenin kendi durumunu (state) yönetmesi veri tutarsızlığına yol açar.

### Uygulama Şeması:
1. **Durum Depolama:** Rust tarafında bir `AppState` struct'ı oluşturulur ve `tauri::State` içine kaydedilir.
2. **Yazma İşlemi:** Bir pencere bir ayarı değiştirdiğinde bir `Command` çağırır.
3. **Yayınlama (Broadcasting):** Rust tarafında durum güncellendikten sonra `app.emit_all("state-changed", payload)` ile tüm pencerelere haber verilir.
4. **Güncelleme:** Pencereler `listen` ile bu haberi alır ve React state'lerini (veya Zustand store'larını) günceller.

## 2. IPC Performansını Artırma

Yüzlerce pencereye aynı anda veri göndermek (örneğin eğitim sırasındaki canlı loss değerleri) IPC hattını tıkayabilir.

- **Throttling:** Veriler her milisaniye değil, her 100ms'de bir paketlenerek (batch) gönderilmelidir.
- **Selective Emission:** Her veriyi her pencereye gönderme. `app.get_window("stats")?.emit(...)` kullanarak sadece ilgili pencereyi güncelle.

## 3. Window Management (Pencere Yönetimi)

Doomsgame gibi projelerde pencerelerin konumu ve boyutu hatırlanmalıdır.

- **Tauri Plugin Store:** Ayarları JSON olarak diske kaydetmek için en güvenli yoldur.
- **Custom Sidecar Logic:** Eğer ağır bir iş (örn. video işleme veya model eğitimi) yapılacaksa, bunu bir `sidecar` (ayrı bir binary) olarak çalıştırıp ana uygulamayı hafif tutmak performansı artırır.

## 4. UI/UX Senkronizasyonu (Micro-frontend Yaklaşımı)

Farklı pencerelerin görsel olarak bütünlük içinde olması için:
- **Shared CSS Tokens:** `index.css` içindeki değişkenler (`--primary`, `--blur-amount`) tüm pencerelerde aynı olmalıdır.
- **Global Event Bus:** TypeScript tarafında pencereden bağımsız bir `EventBus` sınıfı yazılarak, pencereler arası iletişim soyutlanabilir.
