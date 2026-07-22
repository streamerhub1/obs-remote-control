# Структура монорепозитория

```text
obs-remote-control/
├── apps/
│   ├── desktop/
│   │   └── src/
│   │       ├── main/
│   │       ├── preload/
│   │       ├── renderer/
│   │       └── shared/
│   ├── website/
│   └── backend/
│       └── src/modules/
│           ├── auth/
│           ├── users/
│           ├── devices/
│           ├── moderators/
│           ├── permissions/
│           ├── sessions/
│           ├── signaling/
│           ├── billing/
│           └── releases/
├── packages/
│   ├── api-client/
│   ├── database/
│   ├── env/
│   ├── logger/
│   ├── obs-adapter/
│   ├── obs-contracts/
│   ├── p2p-protocol/
│   ├── permissions/
│   ├── shared-types/
│   ├── ui/
│   └── validation/
├── infrastructure/
│   ├── docker/
│   ├── coturn/
│   └── deployment/
├── docs/
├── scripts/
├── .github/workflows/
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Правила

- React-компоненты не вызывают OBS напрямую.
- Signaling не содержит OBS-бизнес-логики.
- Permission resolution находится в одном общем пакете.
- API contracts и P2P contracts общие.
- Billing provider изолирован интерфейсом.
- OBS mapping находится в `obs-adapter`.
