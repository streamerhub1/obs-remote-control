# Правила кода и Definition of Done

## TypeScript

- `strict: true`;
- без `any` без объяснения;
- внешние данные через Zod;
- exhaustive switch;
- типизированные ошибки.

## React

- бизнес-логика вне компонентов;
- компоненты не вызывают OBS;
- server state через TanStack Query;
- формы через React Hook Form + Zod.

## Backend

- route → service → repository;
- permission check в service;
- транзакции;
- idempotency;
- audit;
- structured logging.

## Electron

- renderer sandbox;
- узкий preload API;
- секреты только main;
- IPC validation;
- URL/deep link validation.

## Тесты

- Vitest unit;
- integration с PostgreSQL/Redis;
- mock OBS server;
- WebRTC integration;
- Playwright E2E.

Критический E2E:

1. Стример и модератор входят через Twitch.
2. Стример добавляет модератора по коду.
3. Модератор принимает.
4. Стример выдаёт права.
5. Модератор подключается.
6. Переключает сцену.
7. Стример отзывает доступ.
8. Следующая команда блокируется.

## Задача готова, когда

- реализация завершена;
- нет временных скрытых заглушек;
- lint проходит;
- typecheck проходит;
- тесты проходят;
- production build проходит;
- миграции работают на чистой БД;
- права проверяются;
- ошибки обработаны;
- loading/empty/error states присутствуют;
- документация обновлена;
- секреты не попали в код или логи.
