# Aillame Yerel Hafıza Sistemi Belgesi (Local Memory System)

Bu doküman, Aillame Nano'nun Faz 6 kapsamında hayata geçirilen **Yerel Hafıza ve Bağlam Yönetimi (Memory & Context Management)** altyapısının teknik özelliklerini, şemasını, API yollarını ve güvenlik politikalarını açıklamaktadır.

---

## 📂 1. Depolama ve Dosya Konumu

Tüm yerel hafıza kayıtları tek bir yerel JSON dosyasında depolanır:
- **Dosya Konumu:** `.aillame-data/stores/aillame-memory.json`
- **Dosya Formatı:** UTF-8 kodlamalı, girintili JSON dizisi.
- **Yazma Garantisi (Atomic Write):** Dosyaya yazma işlemleri doğrudan hedef dosyaya yapılmaz. Önce geçici bir `.aillame-memory.json.tmp` dosyası oluşturulur ve yazma başarılı olduktan sonra işletim sistemi seviyesinde atomik `rename` işlemiyle hedef dosya üzerine yazılır. Bu sayede elektrik kesilmesi, çökme veya kilitlenmelerde verinin yarım yazılması ve dosyanın bozulması %100 engellenir.
- **Hata Toleransı ve Kendini İyileştirme (Self-Healing):** JSON dosyasının elle yanlış düzenlenmesi veya bozulması durumunda, `readMemoryFile` motoru hatayı yakalar:
  1. Bozuk dosyayı otomatik olarak `.aillame-memory.json.corrupted-<timestamp>` adıyla yedekler.
  2. Boş bir diziyle (`[]`) yeni ve temiz bir yerel hafıza dosyası yazar.
  3. Uygulama ve chat akışı hiç çökmeden temiz bir şekilde çalışmaya devam eder.

---

## 🔒 2. Hassas Veri Koruması (Security Shield)

Aillame, kullanıcı gizliliğini en üst düzeyde korumak amacıyla yerel hafızaya hassas kişisel verilerin, kimliklerin ve parolaların kaydedilmesini engeller.

**Engellenen Veri Kalıpları (Regex):**
- **Parolalar:** `password`, `şifre`, `parola`, `passphrase` vb.
- **Gizli Anahtarlar & Tokenlar:** `secret`, `token`, `api key`, `apikey`, `private key` vb.
- **SSH/Kriptografik Anahtarlar:** `ssh-rsa`, `begin cryptographic key`, `begin private key` vb.
- **Finansal Bilgiler:** `credit card`, `kredi kartı`, `cvv`, `expiry`, `iban`, `banka`, `hesap no` vb.
- **Kimlik Bilgileri:** `tc kimlik`, `identity`, `ssn`, `pasaport` vb.
- **Yetkilendirme:** `bearer`, `auth`, `credentials` vb.

Hafızaya eklenmek istenen içerik veya etiketlerde bu kalıplardan biri eşleştiğinde, API istekleri **400 Bad Request** ile reddedilir ve kullanıcıya açıklayıcı bir Türkçe uyarı döner.

---

## 📡 3. API Kontratları (Endpoints)

Hafıza yönetim işlemleri standart RESTful API rotaları üzerinden gerçekleştirilir:

### A) Hafıza Kayıtlarını Listeleme / Arama
- **Rota:** `GET /api/aillame/memory`
- **Sorgu Parametresi:** `?q=kelime` (isteğe bağlı, içerik ve etiketlerde filtreleme yapar)
- **Yanıt:** `AillameMemory[]` JSON dizisi.

### B) Yeni Hafıza Kaydı Oluşturma
- **Rota:** `POST /api/aillame/memory`
- **İstek Gövdesi (Request Body):**
  ```json
  {
    "type": "preference",
    "scope": "user",
    "content": "Kullanıcı SEO uyumlu Türkçe içerikleri tercih eder.",
    "tags": ["seo", "türkçe", "içerik"]
  }
  ```
- **Yanıt:**
  ```json
  {
    "id": "1779035599476-7nu9ej4v",
    "type": "preference",
    "scope": "user",
    "content": "Kullanıcı SEO uyumlu Türkçe içerikleri tercih eder.",
    "tags": ["seo", "türkçe", "içerik"],
    "source": "user_approved",
    "createdAt": "2026-05-17T16:33:19.475Z",
    "updatedAt": "2026-05-17T16:33:19.475Z",
    "sensitive": false
  }
  ```

### C) Hafıza Kaydı Silme
- **Rota:** `DELETE /api/aillame/memory` veya `POST /api/aillame/memory` (Tauri masaüstü uyumluluğu için `action: "delete"`)
- **İstek Parametresi / Gövdesi:** `{ "id": "1779035599476-7nu9ej4v" }`
- **Yanıt:** `{ "success": true }`

---

## 🧠 4. Bilişsel Bağlam Entegrasyonu (Prompt Injection)

Kullanıcı `aillame-nano` text-only sohbet modunda bir prompt gönderdiğinde, arka planda şu işlemler yürütülür:

1. **İçeriksel Tarama:** Kullanıcının prompt'u kelimelerine ayrılır ve hafıza veritabanındaki kayıtların etiketleri ve içerikleri ile eşleştirilir.
2. **Relevance Skorlaması:**
   - Tür eşleşmesi (`preference`, `project` vb.) ek ağırlık sağlar (+2 puan).
   - Prompt'ta geçen kelimelerin hafıza içeriğinde geçmesi durumunda +3 puan, etiketlerde geçmesi durumunda +4 puan eklenir.
3. **Alt Sınır & Limit:** Sadece skoru 0'dan büyük olan en alakalı **en fazla 3 kayıt** seçilir.
4. **Context Injection:** Seçilen kayıtlar, asistanın sistem promptunun en altına `"Kullanıcı Tercihleri ve Yerel Bağlam Yönergeleri:"` başlığı altında şık bir şekilde enjekte edilir:
   ```text
   [SİSTEM YÖNERGESİ - YEREL BAĞLAM]
   Aşağıdaki yönergeler kullanıcının yerel hafızasından alınmıştır ve yanıtlarken bunlara öncelik verilmelidir:
   - Tercih: Kullanıcı SEO uyumlu Türkçe içerikleri tercih eder. (Etiketler: seo, türkçe)
   ```
5. **Hata İzolasyonu:** Eğer hafıza araması veya dosya okuma işlemi sırasında beklenmeyen bir disk hatası oluşursa, hata sessizce loglanır ve chat akışı **hiç kesintiye uğramadan** normal sistem promptu ile devam eder.

---

## 🛠️ 5. Geliştirici Doğrulama Komutları

Yerel hafıza sisteminin tüm katmanlarını otomatik olarak test etmek için özel olarak hazırlanan doğrulama betiğini çalıştırabilirsiniz:

```bash
# Otomatik Hafıza Sistemi Entegrasyon Testi
npx tsx scripts/smoke-phase6.1-memory-system-validation.ts
```

Bu betik sırasıyla boş durum yönetimini, kayıt eklemeyi, arama alaka skorlamasını, hassas veri filtrelemelerini, oturum belleğini ve kendini iyileştirme (self-healing) mekanizmalarını uçtan uca simüle ederek doğrular.

---

| Özellik | Yerel Hafıza (Local Memory) | Proje Bağlamı (Workspace Context) | Yerel Distillation Dataset (Phase 9) |
| :--- | :--- | :--- | :--- |
| **Ana Amacı** | Kullanıcı tercihlerini, genel alışkanlıklarını ve kalıcı bilgileri tutmak. | Çalışılan projenin hedeflerini, tonunu ve SEO ayarlarını yönetmek. | Gelecekteki model eğitimleri ve bilişsel router iyileştirmeleri için veri toplamak. |
| **Etki Alanı** | Genel ve global (tüm sohbetlerde semantik arama ile tetiklenir). | Lokal ve hedefli (sadece o an seçili olan aktif proje aktifse devreye girer). | Tamamen izole veri seti deposu (sadece export/import ve settings yönetimli). |
| **Seçim Biçimi** | Otomatik kelime/etiket skorlamasıyla en alakalı 3 adet hafıza dinamik olarak prompt'a enjekte edilir. | Kullanıcı tarafından Ayarlar panelinden veya sohbet üzerinden aktif edilir. | Chat akışında otomatik enjekte olmaz. response metadata içinde suggestion üretilir fakat kullanıcı onayıyla JSONL dosyasına kaydedilir. |
| **SEO Ayarları** | Yok. | Var. | Yok. |
| **Birlikte Çalışma** | Aktif bir proje seçildiğinde, Nano inference'ında prompt'a hem **1 adet Aktif Proje Bağlamı** hem de en alakalı **3 adet Yerel Hafıza** eşzamanlı olarak eklenerek kusursuz bir hibrit bağlam oluşturulur. |||
