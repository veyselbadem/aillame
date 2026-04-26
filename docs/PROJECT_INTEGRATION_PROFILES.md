# Aillame Proje Entegrasyon Profilleri

Aillame, farklı uygulamaların (Doomsgame, BOSS, Bademakademi vb.) ihtiyaçlarına göre özelleştirilmiş güvenlik ve yetki profilleri sunar.

## 1. Doomsgame Profile
- **projectId:** `doomsgame`
- **Görevler:** Oyun haberleri taslağı, embed önerileri, genel metin üretimi.
- **Kapsam:** Proje bazlı hafıza (project memory).

## 2. BOSS AI Profile
- **projectId:** `boss-ai`
- **Görevler:** Ekonomi haber analizi, piyasa özeti, portföy açıklamaları.
- **Güvenlik:** Kesin yatırım tavsiyesi verilmez. "Yatırım tavsiyesi değildir" uyarısı zorunludur.

## 3. Bademakademi Profile
- **projectId:** `bademakademi`
- **Görevler:** Konu anlatımı, quiz hazırlama, ders özeti, z-kitap içeriği.
- **Güvenlik:** Pedagojik dil, çocuklara uygun içerik filtresi.

## 4. Yeni Proje Ekleme
Yeni bir proje eklemek için `src/core/integration/project-profiles.ts` dosyasına yeni bir tanım eklenmeli ve bir API Key oluşturulmalıdır.

### Önemli Güvenlik Notları:
- **Client Isolation:** Her projenin verisi ve hafıza alanı (memoryScope) birbirinden izoledir.
- **Task Restricted:** Sadece izin verilen `allowedTasks` listesindeki işlemler gerçekleştirilebilir.
- **API Key Proxy:** API Key'ler asla frontend koduna gömülmemeli; backend üzerinden proxy edilmelidir.
