# Aillame Code Agent Patch Workflow

Aillame Code Agent, projeleriniz üzerinde değişiklik yaparken güvenliği en üst düzeyde tutan bir yama (patch) iş akışı kullanır.

## İş Akışı Döngüsü (Workflow Lifecycle)

1.  **Scanner:** Proje yapısı taranır, bağlam (context) özetlenir.
2.  **Planner:** Yapılacak değişiklikler adımlara bölünür ve risk analizi yapılır.
3.  **Patch Proposal:** `proposed` durumunda bir yama önerisi oluşturulur.
4.  **Preview:** Kullanıcıya `unified diff` formatında (hassas içerikler temizlenmiş) gösterilir.
5.  **Approval Gate:** Kullanıcıdan `Approval Token` talep edilir.
6.  **Dry-Run:** Onay sonrası, dosya sistemi etkilenmeden işlemin uygulanabilirliği test edilir.
7.  **Apply:** Onaylı ve güvenli dosya yazma işlemi gerçekleştirilir.
8.  **Verify:** Yama sonrası projeyi bozup bozmadığını anlamak için allowlist'teki komutlar çalıştırılır.

## Güvenlik Politikaları (Safety Policies)

### 1. Hassas Dosya Koruması (Sensitive File Guard)
Aşağıdaki dosya ve klasörlere yama uygulanması veya okunması varsayılan olarak engellenmiştir:
- `.env` ve türevleri
- `.key`, `.pem`, `secrets` dosyaları
- `node_modules`, `.next`, `.git` klasörleri
- `package-lock.json`

### 2. Yetki Denetimi (Approval Gate)
- `approvalRequired: true` olan görevler, geçerli bir `approvalToken` olmadan asla `apply` edilemez.
- Tokenlar workflow bazlıdır ve sürelidir (varsayılan 30 dk).

### 3. Komut Kısıtlamaları (Verifier Allowlist)
Sadece güvenli yapılandırma ve test komutlarına izin verilir:
- `npm run typecheck`
- `npm run build`
- `npm test`
- `cargo check`
- `npm run smoke:*`

Tehlikeli operatörler (`;`, `&&`, `|`, `>`) ve yıkıcı komutlar (`rm`, `git push`, `npm install`) engellenir.

## Denetim (Audit)
Tüm workflow olayları `code-agent.patch.*` action'ları ile audit log'da tutulur.

## Geri Alma (Rollback)
Her yama işlemi öncesinde orijinal içerik snapshot'ları veya geri yükleme talimatları (`rollbackNotes`) üretilir.
