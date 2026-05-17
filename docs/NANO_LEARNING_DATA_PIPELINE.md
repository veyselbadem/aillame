# Aillame Nano Learning Data Pipeline

Aillame Nano'nun ileride otonom olarak eğitilebilmesi ve uzmanlaşabilmesi için kurulan veri toplama ve geri bildirim hattıdır.

## 1. Amacı

Bu hattın temel amacı, gerçek kullanım senaryolarından (chat, execution, user feedback) yüksek kaliteli, sanitize edilmiş ve güvenli eğitim verisi setleri (training datasets) oluşturmaktır.

## 2. Hangi Veriler Kaydedilir?

- **Görev Analizi**: Nano'nun algıladığı niyet (intent) ve planladığı yetenekler (capabilities).
- **Yürütme Sonuçları**: Adımların başarı durumu, seçilen modeller ve gecikme süreleri.
- **Kullanıcı Geri Bildirimleri**: Up/Down oyları, düzeltmeler ve onaylar.
- **Kısıtlı Mesaj Özeti**: Kullanıcı mesajının redaction (hassas veri temizliği) işleminden geçirilmiş hali.

## 3. Hangi Veriler Kaydedilmez? (Privacy-First)

Aşağıdaki veriler otomatik olarak **REDACT** edilir (silinir veya maskelenir):
- **API Key ve Tokenlar**: Herhangi bir servis anahtarı veya yetkilendirme jetonu.
- **Şifreler**: Metin içindeki şifre benzeri yapılar.
- **Dosya Yolları**: Sisteme ait tam dosya yolları (`C:\Users\...` veya `/home/...`).
- **E-postalar**: Kullanıcıya ait e-posta adresleri.
- **Secrets**: `.env` dosyası benzeri `KEY=VALUE` çiftleri.

## 4. Kayıt Durumları ve Güvenlik

- **`safeForTraining: false`**: Tüm kayıtlar varsayılan olarak "eğitim için güvensiz" işaretlenir.
- **`requiresReview: true`**: Her kayıt bir admin panelinden incelenmek üzere işaretlenir.
- **JSONL Formatı**: Veriler UTF-8 kodlamasıyla JSONL formatında `.aillame-data/nano-feedback/` dizininde saklanır.
- **Quarantine**: Bozuk veya şüpheli kayıtlar otomatik olarak karantinaya alınır.

## 5. Veri Yaşam Döngüsü

1. **Capture**: Chat veya Execution sonrası pasif olarak veri yakalanır.
2. **Redact**: Hassas veriler anlık olarak maskelenir.
3. **Store**: JSONL dosyasına eklenir.
4. **Candidate Generation**: Geri bildirim alan kayıtlar eğitim adayı (candidate) olarak işaretlenir.
5. **Admin Review**: (Gelecek Faz) Admin kaydı inceler, gerekirse düzeltir ve `safeForTraining: true` yapar.
6. **Export**: Onaylı veriler eğitim setine dahil edilir.

---
**Son Güncelleme**: 2026-05-16
**Versiyon**: 1.3.0-learning-stable
