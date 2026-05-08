# Final Security Checklist

## Git dışında kalması gerekenler

- `.env` ve local environment dosyaları.
- `igm-venv` ve Python virtual environment içeriği.
- GGUF, safetensors, checkpoint ve diğer model dosyaları.
- `.aillame-data` runtime data klasörü.
- Generated image ve diğer generated asset çıktıları.
- Agent backup, audit ve memory data dosyaları.
- Local log, temp request JSON, worker stderr ve patch output temp dosyaları.

## Provider auth

- Provider API `Authorization: Bearer YOUR_AILLAME_API_KEY` header bekler.
- Gerçek key dokümanlarda veya test çıktılarında yer almaz.
- Unauthorized requestler 401 ile dönmelidir.

## Admin agent endpointleri

- Admin agent endpointleri güvenli plan, context, patch proposal, apply ve audit akışına bağlıdır.
- Terminal command execution endpointi eklenmemelidir.
- Otomatik test execution endpointi eklenmemelidir.

## Safe-write approval

- Gerçek apply için explicit approval zorunludur.
- Approval text boş veya çok kısa olursa apply reddedilir.
- Riskli değişikliklerde güçlü onay ifadesi gerekir.

## Dry run

- Dry run gerçek dosya yazmaz.
- UI gerçek apply öncesinde dry run sonucunu bekler.
- Smoke testleri dry-run guard metinlerinin korunduğunu doğrular.

## Backup

- Apply path backup mekanizmasını korur.
- Backup artefaktları git dışında kalır.
- Backup içeriği final dokümanlara yazılmaz.

## No command execution

- Agent terminal komutu çalıştırmaz.
- Komut planları dry-run policy seviyesinde kalır.
- Önerilen doğrulama komutları kullanıcıya bırakılır.

## No auto test execution

- Execution audit test komutlarını sadece önerir.
- Suggested command kayıtlarında `autoRun=false` korunur.
- Test çalıştırma kullanıcının veya release operatörünün açık eylemidir.
