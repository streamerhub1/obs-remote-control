# Безопасность

## Угрозы

- перебор invite-кодов;
- захват app session;
- подмена signaling;
- повтор команды;
- произвольный OBS request;
- утечка OBS password;
- вредоносный file transfer;
- renderer compromise;
- подмена обновления;
- vendor request abuse.

## Защита

### Invite code

- высокая энтропия;
- нормализация;
- rate limit;
- отсутствие user enumeration;
- cooldown при подозрительной активности.

### Устройства

- уникальная key pair;
- private key в secure storage;
- public key на backend;
- challenge-response;
- отзыв устройства.

### Electron

- context isolation;
- sandbox;
- node integration off;
- preload allowlist;
- CSP;
- проверка deep links;
- проверка внешних URL;
- секреты не передаются renderer.

### OBS

- пароль только локально;
- allowlist команд;
- проверка permissions приложением стримера;
- подтверждение опасных действий;
- audit log.

### Файлы

- лимит размера;
- MIME allowlist;
- безопасные имена;
- временная директория;
- защита от path traversal;
- отсутствие произвольного пути от модератора.

### Обновления

- code signing;
- подписанный manifest;
- SHA-256;
- HTTPS;
- rollback protection.

Особо опасные действия:

- остановка стрима;
- удаление сцен и источников;
- смена profile/scene collection;
- новый Browser Source URL;
- file transfer;
- vendor request.
