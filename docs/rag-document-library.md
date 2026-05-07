# Aillame RAG & Document Library Guide

Aillame, yerel belgelerinizi güvenli bir şekilde indeksleyip yapay zeka cevaplarında kullanmanızı sağlar.

## Desteklenen Formatlar
- **Plain Text (.txt):** Ham metin dosyaları.
- **Markdown (.md):** Yapılandırılmış metin ve teknik dokümanlar.
- **JSON (.json):** Veri setleri ve yapılandırılmış bilgiler.
- **Source Code (.ts, .js, .py vb.):** Kod snippet'leri.

## Ingestion & Güvenlik
Belge alım sürecinde şu kontroller uygulanır:
- **Sensitive Guard:** Belge içeriğinde API anahtarı, şifre veya gizli anahtar (private key) tespit edilirse işlem reddedilir.
- **Isolation:** Her belge bir `projectId` ile ilişkilendirilir. Bir projenin belgesi, başka bir projenin RAG sürecinde kullanılmaz.

## Chunking & Vektör Hafızası
Büyük belgeler, anlam bütünlüğünü korumak için küçük parçalara (chunks) ayrılır:
- Varsayılan parça boyutu: 1000 karakter.
- Parça örtüşmesi (overlap): 100 karakter.
- Her parça, vektör hafızasında (vector memory) bağımsız olarak aranabilir hale getirilir.

## Attribution (Kaynak Gösterimi)
Aillame, RAG kullanarak ürettiği cevaplarda şu kaynakları raporlayabilir:
- `document`: Belge adı ve meta verisi.
- `document-chunk`: Belgenin hangi parçasının kullanıldığı.
- `vector-memory`: Vektör araması sonucu bulunan benzer içerik.

## Kullanım & Yönetim
Admin paneli üzerinden şunları yapabilirsiniz:
- Belge durumunu değiştirme (Active / Disabled).
- Belgeleri yumuşak silme (Soft Delete).
- Proje bazlı belge listeleme ve arama.

## Smoke Test
```bash
npm run smoke:rag-document-library
```
