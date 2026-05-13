# Workspace Agent Safety Architecture Index

## 1. Amaç
Bu doküman, Aillame projesi kapsamında geliştirilen Workspace Agent güvenlik mimarisinin tüm katmanlarını tek bir indekste toplar. Dokümantasyon setinin bütünlüğünü sağlar ve projenin "yürütülemez" (no-execution) statüsündeki güvenlik bariyerlerini özetler.

## 2. Kapsam
Kapsam, şu ana kadar tamamlanan dört ana güvenlik hattını (Manual Context, Plan/Review, Execution Readiness, Execution Gate) içerir. Tüm hatlar **no-execution / no-grant / no-persistence** prensibiyle mühürlenmiştir.

## 3. Güvenlik Mimarisi Katmanları
Sistem, kademeli bir güvenlik akışı üzerine kuruludur:

`Manual Context` → `Plan/Review` → `Execution Readiness` → `Execution Gate` → `Future Execution Phase (Kapsam Dışı)`

- Bu mimari mevcut durumda **execution (yürütme) yetkisi açmaz**.
- Tüm katmanlar "Safe Baseline" (Güvenli Temel) seviyesindedir.

---

## 4. Manual Workspace Context
Kullanıcının çalışma alanındaki dosyaları manuel olarak Chat/Nano'ya eklediği ilk güvenlik katmanıdır.
- **Sınırlar:** Görünür mesaj sınırı, manuel ekleme, UI-only metadata.
- **Güvenlik:** Nano yalnızca görünür context'i görür; RAG veya gizli prompt enjeksiyonu yoktur.
- **Dokümanlar:**
    - [Manual Workspace Context](./manual-workspace-context.md)
    - [Safety Checklist](./manual-workspace-context-safety-checklist.md)
    - [Release Readiness](./manual-workspace-context-release-readiness.md)

---

## 5. Workspace Agent Plan/Review
Agent'ın bir görev için oluşturduğu planın kullanıcı tarafından incelendiği katmandır.
- **Sınırlar:** `executable=false`, plan-only, bellek içi özet.
- **Güvenlik:** Onay (approval) işlemi yürütme başlatmaz; ActionExecutor kapalıdır.
- **Dokümanlar:**
    - [Plan/Review Flow](./workspace-agent-plan-review.md)
    - [Safety Checklist](./workspace-agent-plan-review-safety-checklist.md)
    - [Release Readiness](./workspace-agent-plan-review-release-readiness.md)

---

## 6. Execution Readiness
Gelecekteki olası yürütme adımlarının "hazırlık" durumunun denetlendiği katmandır.
- **Sınırlar:** `readiness_only`, `satisfied=false`, aktif yetki sayısı 0.
- **Güvenlik:** Yetki verme (permission grant) veya yürütme motoru bulunmaz.
- **Dokümanlar:**
    - [Execution Readiness Flow](./workspace-agent-execution-readiness.md)
    - [Safety Checklist](./workspace-agent-execution-readiness-safety-checklist.md)
    - [Release Readiness](./workspace-agent-execution-readiness-release-readiness.md)
    - [Final Closure](./workspace-agent-execution-readiness-final-closure.md)

---

## 7. Execution Gate
Yürütme taleplerinin güvenlik bariyeri (gate) seviyesinde denetlendiği son katmandır.
- **Sınırlar:** `gate_check_only`, `canExecute=false`, `issuedCapability=null`.
- **Güvenlik:** Kararlar asla `allowed` olmaz; sadece denetim ve risk analizi üretilir.
- **Dokümanlar:**
    - [Execution Gate Flow](./workspace-agent-execution-gate.md)
    - [Safety Checklist](./workspace-agent-execution-gate-safety-checklist.md)
    - [Release Readiness](./workspace-agent-execution-gate-release-readiness.md)
    - [Final Closure](./workspace-agent-execution-gate-final-closure.md)

---

## 8. Ortak Güvenlik Sınırları
Tüm mimari boyunca aşağıdaki sınırlar mühürlenmiştir:
- **Execution:** Yürütme yok.
- **File/Shell:** Dosya yazma ve terminal komutu çalıştırma yok.
- **Grant/Capability:** Yetki verme ve token üretimi yok.
- **Action/Registry:** ActionExecutor ve Command Registry kapalı.
- **Data:** RAG, otomatik retrieval ve gizli prompt enjeksiyonu yok.
- **Persistence:** Disk, localStorage veya sessionStorage kaydı yok.
- **Context:** Pano kopyalama otomatik bir akış başlatmaz.

## 9. Release / Closure Durumu
- Tüm dört hat (Manual Context, Plan/Review, Readiness, Gate) release-ready kabul edilmiş ve **final closure** dokümanlarıyla kapatılmıştır.

## 10. Smoke ve Regression Komutları
Sistemin bütünlüğü aşağıdaki komutlarla doğrulanır:

**Manual Context:**
- `npm run smoke:phase41-manual-context-flow-regression`
- `npm run smoke:phase45-manual-context-docs`

**Plan/Review:**
- `npm run smoke:phase47-workspace-agent-planning-boundary`
- `npm run smoke:phase48-workspace-agent-plan-preview-ui`
- `npm run smoke:phase49-workspace-agent-plan-review-skeleton`
- `npm run smoke:phase50-workspace-agent-review-summary`
- `npm run smoke:phase54-workspace-agent-plan-review-docs`

**Execution Readiness:**
- `npm run smoke:phase56-workspace-agent-execution-readiness-boundary`
- `npm run smoke:phase57-workspace-agent-execution-readiness-preview-ui`
- `npm run smoke:phase58-workspace-agent-readiness-review-state`
- `npm run smoke:phase59-workspace-agent-readiness-review-summary`
- `npm run smoke:phase63-workspace-agent-execution-readiness-docs`
- `npm run smoke:phase65-execution-readiness-final-regression`

**Execution Gate:**
- `npm run smoke:phase69-workspace-agent-execution-gate-contract`
- `npm run smoke:phase70-workspace-agent-execution-gate-preview-ui`
- `npm run smoke:phase71-workspace-agent-gate-review-state`
- `npm run smoke:phase72-workspace-agent-gate-review-summary`
- `npm run smoke:phase76-workspace-agent-execution-gate-docs`
- `npm run smoke:phase78-execution-gate-final-regression`

**Global:**
- `npm run typecheck`
- `npm run build`

## 11. Gerçek Execution Fazlarına Geçmeden Önce Kırmızı Çizgiler
- `allowed/granted` kararları için ayrı bir güvenlik review fazı şarttır.
- `ActionExecutor` için kum havuzu (sandboxing) zorunludur.
- Her türlü dosya yazma işlemi için diff-preview ve audit log kurulmalıdır.
- Terminal erişimi için kısıtlı allowlist ve kullanıcı onayı uygulanmalıdır.

## 12. Dokümantasyon Linkleri
Tüm detaylı dokümanlara yukarıdaki bölümlerden veya `README.md` üzerinden erişilebilir.
