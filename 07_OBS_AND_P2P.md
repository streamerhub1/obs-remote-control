# OBS и P2P

## OBS Adapter

```ts
interface ObsAdapter {
  connect(config: ObsConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  getSnapshot(): Promise<ObsSnapshot>;
  execute(command: ObsCommand): Promise<ObsCommandResult>;
  subscribe(listener: (event: ObsEvent) => void): () => void;
}
```

Подключение по умолчанию:

```text
ws://127.0.0.1:4455
```

Пароль хранится локально.

## Собственный command protocol

Нельзя отправлять произвольные названия OBS requests.

```ts
type ObsCommand =
  | { type: "scene.switch"; sceneName: string }
  | { type: "scene.create"; sceneName: string }
  | { type: "scene.remove"; sceneName: string }
  | {
      type: "sceneItem.setEnabled";
      sceneName: string;
      sceneItemId: number;
      enabled: boolean;
    }
  | { type: "input.setMute"; inputName: string; muted: boolean };
```

Для каждой команды нужны:

- Zod schema;
- permission key;
- handler;
- result normalizer;
- audit action;
- unit test;
- integration test;
- UI entry.

## P2P DataChannels

- `control`: ordered, reliable;
- `events`: ordered, reliable;
- `preview`: unordered, допускает потерю;
- `files`: ordered, reliable, chunked.

## Envelope

```ts
interface ProtocolEnvelope<T> {
  version: 1;
  sessionId: string;
  messageId: string;
  sequence: number;
  sentAt: number;
  type: string;
  payload: T;
}
```

## Надёжность

- initial full snapshot;
- затем state events;
- revision для состояния;
- resync при пропуске;
- heartbeat;
- reconnect;
- LRU-кэш commandId;
- повторная команда не выполняется;
- rate limit;
- лимит размера;
- TURN fallback (см. ограничения TURN).

## Handshake

- временный session token;
- device public keys;
- challenge-response;
- проверка пользователя, устройства, срока и permissions;
- несовместимые protocol versions отклоняются.

## Ограничения TURN (Relay)

TURN не считается основным способом передачи данных, а используется только как fallback.
- команды и события могут работать через TURN;
- preview через TURN должен иметь лимит качества, FPS и трафика;
- file transfer через TURN должен иметь ограничения размера;
- приложение должно показывать, используется Direct P2P или Relay;
- возможность preview через TURN должна управляться entitlement и настройками тарифа.
