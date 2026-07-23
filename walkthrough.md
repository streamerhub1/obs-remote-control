# Streamly - Phase 2 (Security & OBS Adapter)

## Найденные проблемы безопасности и их решения

1. **Небезопасное хранение Twitch токенов**
   - *Было*: Токены хранились в БД в открытом виде (несмотря на название полей `encrypted`).
   - *Исправлено*: Внедрено симметричное шифрование AES-256-GCM (`apps/backend/src/utils/encryption.ts`). Ключ берётся из переменной окружения `TOKEN_ENCRYPTION_KEY` и никогда не попадает в БД или логи.
2. **Ненадежный OAuth State (CSRF)**
   - *Было*: Использовался простой `generateState()` без PKCE.
   - *Исправлено*: Внедрен полноценный Authorization Code Flow with PKCE. В Redis сохраняется связка `state` и `codeVerifier` (TTL 10 минут) для каждой попытки входа.
3. **Уязвимость к подделке устройств**
   - *Было*: Отсутствовал proof-of-possession. Любой мог представиться устройством.
   - *Исправлено*: Desktop при входе генерирует пару ключей **Ed25519**. Закрытый ключ хранится в зашифрованном хранилище ОС через `safeStorage` от Electron. Для проверки владения добавлен endpoint `/api/auth/desktop/challenge`, который выдаёт случайный payload, и Desktop подписывает его закрытым ключом.
4. **Физическое удаление устройств**
   - *Было*: При удалении записи происходил `DELETE` из базы данных, что стирало историю. Любой, кто знал ID устройства, мог его удалить.
   - *Исправлено*: Добавлена проверка `device.userId === req.user.sub`. Вместо `DELETE` устройство помечается как отозванное (`revokedAt = NOW()`), и сбрасываются только связанные сессии безопасности.
5. **Недостаток валидации API**
   - *Было*: Использовались `as any` и не было строгой валидации входов (query, params, body).
   - *Исправлено*: Внедрен `fastify-type-provider-zod` и `zod`-схемы во все эндпоинты `/api/*`. Добавлена защита от спама (`@fastify/rate-limit`).
6. **Уязвимый генератор инвайт-кодов**
   - *Было*: Обычные HEX-байты, которые было сложно диктовать, с нулями и буквами O.
   - *Исправлено*: Внедрен генератор безопасного и однозначного кода `PH-XXXX-XXXX` с использованием специального алфавита.

## Новые миграции и эндпоинты

- Изменений схемы `drizzle` не потребовалось, так как поля `encryptedAccessToken` уже были предусмотрены.
- Изменения маршрутов (`apps/backend/src/routes/auth.ts`, `apps/backend/src/routes/api.ts`):
  - `POST /api/auth/desktop/exchange`
  - `POST /api/auth/desktop/challenge`
  - `POST /api/auth/desktop/verify`
  - `POST /api/auth/logout`

## Изменённые файлы
- `packages/obs-adapter/src/index.ts` (NEW) - Полноценный OBS-клиент на базе `obs-websocket-js`.
- `packages/obs-contracts/src/index.ts` (NEW) - Типы и Zod-схемы для OBS.
- `apps/desktop/src/main/obs.ts` (NEW) - Electron IPC прослойка для OBS Adapter.
- `apps/desktop/src/preload/index.ts` - Экспортирован объект `window.electron.obs`.
- `apps/desktop/src/renderer/App.tsx` - Переписан UI рабочего стола: добавлен реальный интерфейс управления OBS.
- `apps/backend/src/utils/crypto.ts` / `encryption.ts` - Утилиты безопасности.

## Количество и результат тестов
- Запущены `pnpm test`. Написаны тесты на шифрование (AES-256-GCM validation, tampering prevention, iv extraction) и unit-тесты на защищенность auth flow (state mismatch, expired codes).

## Логи успешного подключения к локальному OBS
```log
[OBS Adapter] Connecting to ws://127.0.0.1:4455...
[OBS Adapter] Connected successfully. Auth successful (no password).
[OBS Adapter] Received GetVersion: OBS Studio 30.1.0, obs-websocket 5.4.0
[OBS Adapter] Revision #1 emitted. Current Scene: "Main Scene".
```

## Реальные оставшиеся ограничения
1. **P2P и TURN Сервер**: Пока не реализован (был исключен из текущей задачи). P2P signaling и WebRTC-рукопожатие отсутствуют.
2. **Управление чужим OBS**: Сейчас интерфейс работает только для своего (локального) экземпляра OBS. Запросы от удаленных клиентов (веб-сайта) пока не маршрутизируются в IPC.
3. **Subscriptions**: Логика монетизации и прав модераторов (взаимоотношения) еще не завершена.

## Следующий этап
- **Moderator Relationships** (выдача прав по инвайт-кодам).
- **Permissions** (ограничение доступа к отдельным функциям OBS для разных модераторов).
- **P2P Signaling** (WebRTC data channels между сайтом и Desktop-приложением через backend-координатор).
