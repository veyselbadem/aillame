# Aillame Sürümleme ve Yayınlama Politikası (VERSIONING_AND_RELEASE_POLICY.md)

Bu doküman, **Aillame Local AI Foundation** projesinin sürüm kontrolü (version control), yama politikaları, sürüm isimlendirme kuralları ve dağıtım standartlarını tanımlamaktadır.

---

## 🔢 1. Semantic Versioning (SemVer) Yaklaşımı
Aillame, standard `MAJOR.MINOR.PATCH` formatına dayalı SemVer şemasını uygular:

1.  **PATCH (Yama) Sürümleri (Örn: `1.3.0` ➔ `1.3.1`):**
    *   Sadece geriye dönük uyumlu hata düzeltmeleri (bug fixes).
    *   Hafıza veya tool-use servislerindeki küçük optimizasyonlar.
    *   Güvenlik kalkanı (Safety Shield) kelime listesi güncellemeleri.
2.  **MINOR (İkincil) Sürümleri (Örn: `1.3.0` ➔ `1.4.0`):**
    *   Geriye dönük uyumlu yeni özelliklerin eklenmesi.
    *   Yeni bir yerel AI aracının (safe tool-use) sisteme dahil edilmesi.
    *   Arayüze yeni bir tanı/diagnostic panelinin eklenmesi.
3.  **MAJOR (Birincil) Sürümleri (Örn: `1.3.0` ➔ `2.0.0`):**
    *   Geriye dönük uyumsuz (breaking) mimari değişiklikler.
    *   Merkezi bilişsel yönlendiricinin veya sidecar NAPI-RS katmanının kökten değiştirilmesi.

---

## 💾 2. Sürümlere Model Dosyalarının Dahil Edilmemesi (External Models)
*   Kurulum dosyalarının şişmesini önlemek ve donanım performansını korumak için, **GGUF, mmproj ve safetensors formatındaki hiçbir model dosyası sürüm paketlerinin (.msi, .exe, .zip) içine dahil edilmez.**
*   Bu dosyalar her zaman harici dizinlerden (`C:\Aillame\Models`) okunur ve güncellemeler sırasında kesinlikle silinmez veya değiştirilmez.

---

## 📦 3. Dağıtım ve Yayınlama Kuralları
*   **Git Commit Temizliği:** Dağıtım ZIP'leri, MSI/EXE yükleyicileri ve `.aillame-data` gibi yerel test veri tabanları Git repository'sine kesinlikle **commit edilmez.**
*   **Asset Dağıtımı:** Tüm derlenmiş binary yükleyiciler ve sıkıştırılmış paketler yalnızca **GitHub Releases** varlıkları (assets) olarak yayınlanır.
*   **Zorunlu Smoke Testleri:** Bir sürümün kararlı ilan edilip tag'lenebilmesi için, `npm run typecheck`, `npm run build` ve tüm yerel smoke test scriptlerinin (`smoke-phase*.ts`) **100% yeşil (başarılı)** geçmesi zorunludur.
