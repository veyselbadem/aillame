# Aillame Agent Beta-Lock Safety Policy

Bu doküman, Aillame Agent (Kod Asistanı) sisteminin Faz 5 sonu itibarıyla geçerli olan uçtan uca güvenlik protokollerini ve Beta kullanım kurallarını tanımlar.

## 1. Mimari Güvenlik Katmanları

Aillame Agent, otonom kod değişikliği yaparken "Safety-First" prensibiyle 6 katmanlı bir kontrol zinciri kullanır:

1.  **Scan Isolation**: Proje tarama aşamasında `.env`, `.git`, `node_modules`, binary dosyalar ve `.aillame-data` gibi hassas alanlar otomatik olarak ignore edilir.
2.  **Redacted Context**: Dosya okuma aşamasında (`file-reader`) API Key, Secret ve Token gibi hassas kelimeler içeren satırlar otomatik olarak maskelenir.
3.  **Read-Only Planning**: Planlama ve Yama Önerisi aşamaları sadece bellek (memory) üzerinde çalışır; dosya sistemine dokunmaz.
4.  **Human-in-the-Loop (HITL)**: Hiçbir kod değişikliği kullanıcı onayı (`approval`) olmadan kalıcı hale getirilmez.
5.  **Backup & Dry-Run**: Yazma işlemi öncesinde `dryRun` zorunluluğu (UI seviyesinde) ve her durumda otomatik `BackupStore` yedeklemesi yapılır.
6.  **Write Policy Enforcement**: Katı yazma politikası ile hassas sistem dosyalarının, model dosyalarının ve konfigürasyonların üzerine yazılması engellenir.

## 2. Beta Kullanım Kuralları (Beta Lock)

Beta süreci boyunca aşağıdaki kısıtlamalar **kalıcı olarak kilitlenmiştir**:

- **No Auto-Execution**: Agent asla kendi başına terminal komutu çalıştıramaz.
- **No Direct Test Run**: Agent testleri kendisi başlatamaz; sadece kullanıcıya doğrulanmış test komutları önerir (`autoRun: false`).
- **Strict Approval**: Boş veya yetersiz onay metni ile (`approvalText < 5 chars`) yazma işlemi yapılamaz.
- **Atomic Rollback Guidance**: Her işlem sonrası audit raporunda, olası bir hata durumunda kullanılacak backup ID ve rollback rehberi sunulur.
- **Path Masking**: UI ve API yanıtlarında absolute path'ler maskelenmiş şekilde (`safeRootName`) gösterilir.

## 3. Yasaklı İşlemler ve Alanlar

Aşağıdaki alanlara erişim ve yazma yetkisi Agent için tamamen engellenmiştir:
- `.env` ve benzeri gizli dosyalar.
- `igm-venv` (Image Generation sanal ortamı).
- `models/` ve `C:\aillame-models` (Model dosyaları).
- `.aillame-data` (Sistem verileri, yedekler, audit logları).
- `.git` dizini ve binary varlıklar.

## 4. Güvenlik Denetimi (Audit) Listesi

Her sürüm öncesinde `npm run smoke:agent-beta-lock` testi ile şu maddeler doğrulanmalıdır:
- [x] Tüm endpointler admin yetkisi gerektiriyor mu?
- [x] Onay metni denetimi aktif mi?
- [x] Dry-run desteği mevcut mu?
- [x] .env yazma koruması çalışıyor mu?
- [x] Absolute path sızıntısı yok mu?
- [x] UI güvenlik uyarıları yerinde mi?

---
*Aillame Project - Secure Agent Workflow v1.3*
