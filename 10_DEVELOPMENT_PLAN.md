# План разработки

Это порядок реализации модулей одного полноценного продукта, а не отдельные урезанные версии.

## 1. Фундамент

- monorepo;
- TypeScript strict;
- lint/format;
- Turborepo;
- shared packages;
- Docker Compose: PostgreSQL, Redis, coturn;
- CI;
- env validation;
- logging;
- error model.

## 2. Identity

- Twitch OAuth;
- users;
- profile;
- invite code;
- devices;
- web sessions;
- desktop auth;
- deep links;
- secure storage.

## 3. Desktop foundation

- Electron main/preload/renderer;
- IPC;
- navigation;
- tray;
- autostart;
- updater;
- logs;
- settings.

## 4. Модераторы

- поиск по коду;
- invitations;
- accept/reject;
- permissions;
- presets;
- revoke/pause;
- notifications.

## 5. OBS

- local connection;
- snapshot;
- events;
- command registry;
- scenes;
- inputs;
- transforms;
- audio;
- filters;
- transitions;
- studio mode;
- stream/record;
- replay buffer;
- virtual camera;
- profiles;
- collections;
- hotkeys;
- vendor allowlist.

## 6. P2P

- signaling;
- STUN/TURN;
- device identity;
- handshake;
- channels;
- sync;
- reconnect;
- heartbeat;
- deduplication;
- files;
- preview.

## 7. Полный интерфейс

- scenes;
- preview/program;
- source tree;
- properties;
- transforms;
- mixer;
- filters;
- transitions;
- outputs;
- stats;
- confirmations.

## 8. Подписка

- provider abstraction;
- checkout;
- portal;
- webhook;
- entitlements;
- grace period;
- desktop и website UI.

## 9. Сайт

- landing;
- features;
- pricing;
- download;
- account;
- devices;
- sessions;
- subscription;
- privacy;
- terms;
- FAQ.

## 10. Релиз

- installer;
- signing;
- release manifest;
- auto-update;
- channels;
- monitoring;
- backups;
- production deployment.

## 11. Hardening

- threat review;
- load tests;
- network matrix;
- OBS compatibility matrix;
- recovery;
- billing reconciliation;
- account deletion.
