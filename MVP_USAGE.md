# Aillame MVP - Desktop Kullanımı (Tauri v2)

Aillame artık Windows masaüstü uygulaması olarak çalıştırılabilir.

## Kolay Başlatma (Windows)
Proje kökündeki **`Aillame Baslat.bat`** dosyasına çift tıklayarak uygulamayı başlatabilirsiniz. Bu script:
1. `node_modules` klasörünü kontrol eder, yoksa `npm install` çalıştırır.
2. Next.js sunucusunu ve Tauri v2 penceresini başlatır.

### Masaüstü Kısayolu
Masaüstünüze bir kısayol eklemek isterseniz **`Masaustune Aillame Kisayolu Olustur.bat`** dosyasını çalıştırabilirsiniz.

## Manuel Komutlar
Eğer terminalden çalıştırmak isterseniz:

### Masaüstü Dev Modu
```bash
npm.cmd run desktop:dev
```

### Masaüstü Build
```bash
npm.cmd run desktop:build
```

## Bilinen Kısıtlamalar
- MVP aşamasında masaüstü uygulaması yerel Next.js sunucusuna (`localhost:3000`) ihtiyaç duyar.
- Tauri v2 konfigürasyonu kullanılmaktadır.
- Geçerli bir `icon.ico` eklenene kadar build aşamasında ikon hatası alabilirsiniz; ancak geliştirme modu (dev) sorunsuz çalışacaktır.
