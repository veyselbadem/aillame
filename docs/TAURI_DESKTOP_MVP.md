# Aillame Tauri Desktop Shell MVP Documentation (v2)

## Çalıştırma Komutları

### Web Geliştirme (Eskisi Gibi)
```bash
npm.cmd run dev
```
Bu komut Next.js uygulamasını `localhost:3000` adresinde başlatır.

### Masaüstü Geliştirme (Tauri v2)
```bash
npm.cmd run desktop:dev
```
Bu komut:
1. Arka planda Next.js sunucusunu (`npm.cmd run dev`) başlatır.
2. Tauri v2 penceresini açar ve `http://localhost:3000` adresine yönlendirir.

### Windows Kolay Başlatıcılar
- **Aillame Baslat.bat**: Çift tıklayarak bağımlılık kontrolü yapar ve masaüstü modunu başlatır.
- **Masaustune Aillame Kisayolu Olustur.bat**: Masaüstüne hızlı erişim için kısayol ekler.

### Masaüstü Build (Windows)
```bash
npm.cmd run desktop:build
```
Build çıktısı `src-tauri/target/release/bundle/msi` veya `exe` klasöründe yer alır.

## Mimari Yaklaşım (Next.js + Tauri v2)

### Geliştirme Modu (Dev Mode)
MVP aşamasında Tauri v2, yerel Next.js sunucusuna bir kabuk (shell) olarak hizmet eder. `tauri.conf.json` içinde `devUrl` olarak `localhost:3000` kullanılmıştır.

### Production Stratejisi
Aillame API route'ları kullandığı için Next.js'in `output: 'export'` (statik) modu tüm özellikleri desteklemeyebilir. Production için yerel bir Next.js sunucusu veya Rust sidecar API planlanmaktadır.

## Güvenlik Notları
- **Tauri v2 Permissions**: Minimum izinler aktif edilmiştir.
- **CSP**: Geliştirme aşamasında esnek tutulmuştur.
- **Secret Yönetimi**: `.env` dosyaları Tauri config'ine gömülmez, Next.js tarafından okunur.
