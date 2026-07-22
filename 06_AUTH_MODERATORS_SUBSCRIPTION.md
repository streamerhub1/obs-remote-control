# Авторизация, модераторы и подписка

## Twitch OAuth для desktop

1. Desktop создаёт одноразовый login request.
2. Открывает системный браузер.
3. Пользователь проходит Twitch OAuth через backend.
4. Backend связывает callback с request.
5. Браузер открывает deep link:
   `obsremote://auth/callback?request=...`
6. Main process получает одноразовый code.
7. Обменивает его на app session.
8. Refresh token хранится в OS keychain.

Обязательно:

- Authorization Code Flow;
- PKCE;
- state;
- одноразовый code;
- refresh rotation;
- device binding;
- logout/revoke.

## Добавление модератора

1. Стример вводит код.
2. Backend нормализует код.
3. Находит пользователя.
4. Стример подтверждает профиль.
5. Создаётся pending relationship.
6. Модератор получает приглашение.
7. Принимает.
8. Стример задаёт permissions.

## Основные permission keys

```text
obs.read
scenes.read
scenes.create
scenes.update
scenes.delete
scenes.switch
scene_items.read
scene_items.create
scene_items.update
scene_items.delete
inputs.read
inputs.create
inputs.update
inputs.delete
audio.read
audio.mute
audio.volume
audio.monitoring
filters.read
filters.create
filters.update
filters.delete
transitions.read
transitions.update
studio_mode.control
stream.start
stream.stop
record.start
record.stop
replay_buffer.control
virtual_camera.control
screenshots.create
profiles.switch
scene_collections.switch
hotkeys.trigger
vendor_requests.execute
files.transfer
```

## Подписка

Подписка принадлежит стримеру.

Desktop запрашивает одноразовую billing URL и открывает сайт. После оплаты provider webhook обновляет subscription и entitlements.

Пример entitlements:

```json
{
  "remoteControl": true,
  "maxModerators": 10,
  "maxConcurrentSessions": 3,
  "preview": true,
  "fileTransfer": true
}
```

Нельзя проверять доступ только через `plan === "pro"`.
