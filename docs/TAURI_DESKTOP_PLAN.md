# Aillame Tauri Desktop Shell Plan

Aillame'in gelecekte bir masaüstü uygulaması olarak çalışabilmesi için hazırlanan yol haritasıdır.

## 1. Mimari Karar: API + Shell
Aillame Core, bir **Server/API** olarak kalmaya devam edecektir. Tauri, bu API'ye bağlanan bir **Desktop Shell** (Masaüstü Kabuğu) görevi görecektir.

### Neden API + Shell?
- **Modülerlik:** Web, Mobil ve Masaüstü istemcileri aynı API'yi kullanır.
- **Performans:** Ağır model işlemleri server-side (local veya remote) kalır, arayüz hafifleşir.
- **Güvenlik:** API Key ve Token yönetimi merkezi kalır.

## 2. Desktop Shell Özellikleri
- **Server Status:** Yerel Aillame server'ının açık/kapalı durumunu gösterir.
- **Admin Dashboard:** Admin panelini uygulama içinden açar.
- **Log Viewer:** Audit loglarını masaüstünde görüntüler.
- **Task Management:** Devam eden agent görevlerini izler.
- **Quick Chat:** Bir klavye kısayolu ile hızlı sohbet penceresi açar.

## 3. Geliştirme Adımları
1. `src-tauri` dizininin oluşturulması (Tauri init).
2. Rust tarafında local API health check fonksiyonlarının yazılması.
3. React UI'ın Tauri penceresine uygun şekilde optimize edilmesi.
4. Tray ikon (sistem çekmecesi) üzerinden hızlı erişim.

## 4. Güvenlik
- Tauri, sadece yerel (localhost) API'ye veya yetkilendirilmiş uzak API'ye bağlanacaktır.
- API Key'ler işletim sisteminin güvenli depo alanında (keychain/credentials) saklanacaktır.
