# Deep Dive: Product Synergy (Aillame + Badem Akademi)

Bu araştırma, Aillame zekasının Badem Akademi eğitim platformuyla nasıl birleşerek "Akıllı Eğitim Asistanı" ekosistemine dönüşebileceğini analiz eder.

## 1. Vizyon: "Öğreten Yapay Zeka"

Aillame, sadece bir sohbet robotu değil, Badem Akademi'nin müfredatını özümsemiş bir öğretmen asistanı (AI Tutor) olabilir.

### RAG (Retrieval Augmented Generation) Entegrasyonu
Badem Akademi'deki tüm PDF'ler, videolar ve dökümanlar vektör veritabanına (LanceDB veya SQLite-vec) dönüştürülür. Aillame, bir soruya cevap verirken önce bu dökümanlara bakar.

## 2. Kullanım Senaryoları

- **Kişiselleştirilmiş Öğrenme:** Öğrenci bir konuyu anlamadığında, Aillame öğrencinin geçmişine bakarak (Context Memory) konuyu farklı bir örnekle açıklar.
- **Otomatik Değerlendirme:** Öğrencinin yazdığı kodları veya cevapları Aillame anlık olarak analiz eder ve geri bildirim verir.
- **Canlı Soru-Cevap:** Ders sırasında öğrencilerin sorduğu teknik soruları, eğitmen yerine Aillame (Badem Akademi dökümanlarını kullanarak) cevaplar.

## 3. Teknik Gereksinimler

- **Multi-modal Destek:** Öğrencinin ekranındaki bir hatayı veya yazdığı bir soruyu görsel olarak analiz etmek için Qwen3-VL gibi multimodal modellerin entegrasyonu.
- **Context Management:** Öğrencinin tüm eğitim sürecini hatırlayan uzun vadeli bir hafıza (Vector Memory).
- **Domain-Specific Fine-tuning:** Aillame'yi Badem Akademi'nin özel eğitim tonunda konuşması için eğitmek (LoRA ile).

## 4. Stratejik Yol Haritası

1. **Faz 1:** Badem Akademi dökümanları üzerinde çalışan bir "Arama & Özetleme" aracı.
2. **Faz 2:** Öğrenci paneline entegre edilmiş canlı asistan.
3. **Faz 3:** Öğrencinin eksiklerini tespit edip ona özel ders programı çıkaran "AI Mentor".
