# Aillame Model Orchestration & AI Lab

Aillame, farklı yapay zeka modellerinin (Nano, Qwen, SDXL, Gemini) ve araçların (Web Search) uyum içinde çalıştığı bir orkestrasyon katmanına sahiptir.

## 1. Model Orchestration Router

Kullanıcı ana sayfada sadece Aillame Nano ile konuşur. Ancak arka planda Nano, isteğin türünü analiz ederek en uygun modele yönlendirme yapar.

- **Simple Chat:** Nano (Local) cevap verir.
- **Text/Code/Analysis:** Qwen veya Gemini planlanır.
- **Image Generation:** SDXL planlanır.
- **Web Research:** Web Search araçları planlanır.

Eğer ilgili model henüz bağlı değilse, sistem `planning_only` modunda kullanıcıya bilgilendirici bir yanıt döner.

## 2. AI Lab (Yönetici Paneli)

Yöneticiler için özel olarak tasarlanan AI Lab, modeller arası kontrollü tartışmaların yapılabildiği bir laboratuvar ortamıdır.

### Özellikler:
- **Session Management:** Admin tarafından başlatılan, durdurulan ve duraklatılabilen oturumlar.
- **Controlled Multi-Step Loop:** Admin tek tıkla 3-5 adımın (turn) otomatik çalışmasını tetikleyebilir.
- **Safety Loop:** Sonsuz döngü engellenmiştir. `maxTurns` dolduğunda veya admin `stop` dediğinde sistem durur.
- **Error Handling:** Bir model hata verirse `errorCount` artar; kritik eşik (3 hata) aşılırsa oturum otomatik durdurulur.
- **Cross-Model Discussion:** Birden fazla modelin aynı konu üzerinde fikir teatisi yapması.
- **Learning Loop:** AI Lab çıktıları, Nano'nun eğitimi için `Learning Candidate` olarak sisteme beslenebilir.

## 3. Öğrenme Güvenliği

AI Lab çıktıları doğrudan eğitime girmez. Şu aşamalardan geçer:
1. **Candidate:** Otomatik oluşturulan eğitim adayı.
2. **Validator:** Bozuk çıktı, sır sızıntısı veya yüksek risk kontrolü.
3. **Admin Onayı:** Eğitici verinin kalitesinin manuel teyidi.

## 4. Mevcut Durum (MVP+)
- **Nano:** Active (Local)
- **Qwen:** Active (Python Runtime)
- **SDXL:** Active (Python Diffusers / Planning Fallback)
- **Gemini:** Planning Only / Planned

---

### Visual Generation & Prompt Library
AI Lab içinde SDXL tarafından üretilen görseller, modelin görselleştirme yeteneklerini test eder. Üretilen yüksek kaliteli promptlar, ileride Nano'nun multimodal yeteneklerini geliştirmek için bir **Prompt Library** adayı olarak kaydedilebilir. 

**Güvenlik Notu:** Görsel üretim çıktıları doğrudan Nano'nun metin tabanlı eğitim setine dahil edilmez; sadece görsel-metin eşleşmesi (prompt-to-image) veri kümesi için aday olabilir.

---

**Not:** Qwen, Nano modelini doğrudan eğitmez. Qwen'den gelen yüksek kaliteli yanıtlar, `Learning Candidate` pipeline'ı üzerinden admin onayına sunulur ve onaylanan veriler Nano'nun eğitim setine dahil edilir.
