# Архитектура

```text
Twitch
  │
Website / Desktop
  │
Backend API
  ├── Auth
  ├── Users
  ├── Devices
  ├── Moderators
  ├── Permissions
  ├── Billing
  ├── Remote Sessions
  ├── Signaling
  └── Releases
  │
PostgreSQL + Redis

Desktop модератора
  │ WebRTC DataChannel
Desktop стримера
  │ localhost:4455
OBS Studio
```

## Что проходит через backend

- Twitch OAuth;
- app/web sessions;
- профиль;
- invite-коды;
- отношения streamer/moderator;
- разрешения (проверка прав при создании remote session, изменении permissions и выдаче подписанного слепка разрешений);
- подписка и entitlements;
- presence;
- создание remote session;
- signaling;
- временные TURN credentials;
- отзыв сессий;
- информация о релизах.

## Что идёт P2P

- OBS-команды;
- ответы;
- события;
- snapshot;
- preview;
- передаваемые файлы.

## Electron

### Main process

- токены;
- secure storage;
- deep links;
- updater;
- tray;
- окна;
- системные API;
- безопасный IPC.

### Renderer

- только UI;
- не получает refresh token, device private key и OBS password.

### Preload

- ограниченный типизированный API;
- `contextIsolation: true`;
- `nodeIntegration: false`.

## Источник истины

- аккаунт, права и подписка: backend;
- состояние OBS: OBS стримера;
- временный кэш: desktop;
- backend не хранит постоянную копию конфигурации OBS.

## Проверка прав

Каждая отдельная OBS-команда не проходит через backend. Окончательную проверку каждой команды выполняет desktop-приложение стримера на основе выданных разрешений.
