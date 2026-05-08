# Agent User Guide

## Kod Asistanı nasıl kullanılır

Aillame Kod Asistanı beta döneminde kontrollü, onaylı ve audit edilebilir bir akış sunar. Ana amaç workspace hakkında güvenli bağlam toplamak, plan üretmek, patch proposal hazırlamak ve yalnızca kullanıcı onayıyla yazma uygulamaktır.

## Workspace scan

Workspace scan repo yapısını, package scriptlerini ve ilgili dosya alanlarını okur. Secret içeriği yazdırmaz ve external project dosyalarını commit kapsamına almaz.

## Plan

Plan adımı istenen değişikliği görev parçalarına ayırır. Agent bu aşamada dosya yazmaz ve terminal komutu çalıştırmaz.

## Deep context

Deep context ilgili dosyaları ve yakın bağımlılıkları okur. Amaç gereksiz geniş refactor yerine mevcut yapıya uygun küçük değişiklik belirlemektir.

## Patch proposal

Patch proposal beklenen dosya değişikliklerini önerir. Bu öneri uygulanmış sayılmaz; kullanıcı dry run ve onay aşamalarını geçmeden çalışma ağacında yazma yapılmaz.

## Dry run

Dry run değişikliklerin nasıl uygulanacağını simüle eder. Bu aşama dosya yazmaz. Apply butonu dry run tamamlanmadan gerçek uygulama için açılmamalıdır.

## Onaylı apply

Onaylı apply açık onay metni ister. Riskli değişikliklerde onay metni daha güçlü olmalıdır. Apply sırasında backup ve write policy kontrolleri korunur.

## Execution audit

Execution audit uygulama sonucunu, değişen dosyaları, risk durumunu ve önerilen doğrulama komutlarını raporlar. Bu komutlar öneridir; `autoRun=false` politikası korunur.

## Memory cards

Memory cards başarılı veya kısmi işlemlerden güvenli öğrenme kartları üretir. Kartlar secret ve local path redaction uygular; agent memory data git dışında tutulur.

## Güvenlik uyarıları

- Agent onaysız yazmaz.
- Agent terminal komutu çalıştırmaz.
- Agent testleri otomatik çalıştırmaz.
- Agent gerçek secret, token veya `.env` içeriği raporlamaz.
- Runtime data, audit artefaktları ve generated çıktılar commit edilmez.

## Ne yapmaz?

- Terminal komutu çalıştırmaz.
- Testleri otomatik çalıştırmaz.
- Onaysız yazmaz.
- Cloud fallback başlatmaz.
- Model dosyası veya generated asset commit etmez.
