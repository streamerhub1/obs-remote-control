import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@obs-remote/ui';
import { Shield, UserPlus, Trash, Settings2, MonitorPlay, Loader2 } from 'lucide-react';

interface Relationship {
  id: string;
  status: string;
  streamerId?: string;
  moderatorId?: string;
  streamerName?: string;
  streamerLogin?: string;
  moderatorName?: string;
  moderatorLogin?: string;
  createdAt?: string;
}

const PERMISSION_GROUPS = [
  {
    key: 'scenes',
    label: 'Сцены',
    description: 'Просмотр и переключение сцен',
    permissions: ['scenes.read', 'scenes.switch'],
  },
  {
    key: 'sources',
    label: 'Источники',
    description: 'Просмотр источников и управление видимостью',
    permissions: ['sceneItems.read', 'sceneItems.visibility'],
  },
  {
    key: 'audio',
    label: 'Аудио',
    description: 'Mute и громкость',
    permissions: ['audio.read', 'audio.mute', 'audio.volume'],
  },
  {
    key: 'stream',
    label: 'Стрим: запуск/остановка',
    description: 'Статус, запуск и остановка стрима',
    permissions: ['stream.read', 'stream.start', 'stream.stop'],
  },
] as const;

type PermissionGroupKey = (typeof PERMISSION_GROUPS)[number]['key'];
type PermissionGroupState = Partial<Record<PermissionGroupKey, boolean>>;

function expandPermissionGroups(groups: PermissionGroupState) {
  const permissions: Record<string, boolean> = {};
  PERMISSION_GROUPS.forEach((group) => {
    group.permissions.forEach((permission) => {
      permissions[permission] = !!groups[group.key];
    });
  });
  return permissions;
}

function collapsePermissionGroups(permissions: Record<string, boolean>): PermissionGroupState {
  const groups: PermissionGroupState = {};
  PERMISSION_GROUPS.forEach((group) => {
    groups[group.key] = group.permissions.some((permission) => !!permissions[permission]);
  });
  return groups;
}

function statusLabel(status: string) {
  if (status === 'pending') return 'Ожидает';
  if (status === 'active') return 'Активен';
  if (status === 'rejected') return 'Отклонён';
  if (status === 'revoked') return 'Отозван';
  return status;
}

function statusVariant(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'pending') return 'secondary' as const;
  if (status === 'rejected' || status === 'revoked') return 'danger' as const;
  return 'outline' as const;
}

export function Moderators({
  onConnectRemote,
}: {
  onConnectRemote: (token: string) => void;
}) {
  const [asStreamer, setAsStreamer] = React.useState<Relationship[]>([]);
  const [asModerator, setAsModerator] = React.useState<Relationship[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [inviteIdentifier, setInviteIdentifier] = React.useState('');
  const [assignPerms, setAssignPerms] = React.useState<PermissionGroupState>({});
  const [managingPermsFor, setManagingPermsFor] = React.useState<Relationship | null>(null);
  const [currentPerms, setCurrentPerms] = React.useState<PermissionGroupState>({});
  const [error, setError] = React.useState<string | null>(null);

  const fetchRelationships = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.desktop.api.relationships.list();
      setAsStreamer(response?.asStreamer ?? []);
      setAsModerator(response?.asModerator ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchRelationships();
  }, [fetchRelationships]);

  const handleAssign = async () => {
    const value = inviteIdentifier.trim();
    if (!value) return;
    setBusy('assign');
    setError(null);
    try {
      const publicIdMatch = value.match(/^id:\s*(\d+)$/i) ?? value.match(/^(\d+)$/);
      const identity = publicIdMatch
        ? { publicId: Number(publicIdMatch[1]) }
        : { twitchLogin: value };

      await window.desktop.api.relationships.invite({
        ...identity,
        permissions: expandPermissionGroups(assignPerms),
      });
      setInviteIdentifier('');
      setAssignPerms({});
      await Promise.all([
        fetchRelationships(),
        window.desktop.api.notifications.list().catch(() => null),
      ]);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusy(`revoke:${id}`);
    try {
      await window.desktop.api.relationships.revoke(id);
      await fetchRelationships();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openPermissionsModal = async (relationship: Relationship) => {
    setBusy(`permissions:${relationship.id}`);
    try {
      const perms = await window.desktop.api.relationships.getPermissions(relationship.id);
      const map: Record<string, boolean> = {};
      (perms as Array<{ permissionKey: string; allowed: boolean }>).forEach((perm) => {
        map[perm.permissionKey] = perm.allowed;
      });
      setCurrentPerms(collapsePermissionGroups(map));
      setManagingPermsFor(relationship);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const savePermissions = async () => {
    if (!managingPermsFor) return;
    setBusy(`save:${managingPermsFor.id}`);
    try {
      await window.desktop.api.relationships.setPermissions(managingPermsFor.id, {
        permissions: expandPermissionGroups(currentPerms),
      });
      setManagingPermsFor(null);
      await fetchRelationships();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const requestRemoteSession = async (relationship: Relationship) => {
    setBusy(`session:${relationship.id}`);
    try {
      const data = await window.desktop.api.remoteSessions.create({ relationshipId: relationship.id });
      if (data?.authorizationToken) onConnectRemote(data.authorizationToken);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const renderPermissionGroups = (
    value: PermissionGroupState,
    setValue: React.Dispatch<React.SetStateAction<PermissionGroupState>>,
  ) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PERMISSION_GROUPS.map((group) => (
        <label
          key={group.key}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 bg-black/30 p-3 text-sm hover:bg-white/5"
        >
          <input
            type="checkbox"
            checked={!!value[group.key]}
            onChange={(e) => setValue((prev) => ({ ...prev, [group.key]: e.target.checked }))}
            className="mt-1 rounded border-gray-700 bg-black text-blue-600 focus:ring-blue-500"
          />
          <span className="min-w-0">
            <span className="block font-medium text-gray-100">{group.label}</span>
            <span className="block text-xs text-gray-500">{group.description}</span>
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h2 className="flex items-center gap-3 text-2xl font-semibold text-gray-100 sm:text-3xl">
          <Shield className="text-blue-500" size={30} /> Модераторы
        </h2>
        <p className="text-sm text-gray-400 sm:text-base">
          Назначение модераторов, права доступа и запросы удалённого управления OBS.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card className="max-w-3xl border-gray-800 bg-[#161616]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-purple-400" /> Назначить модератора
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={inviteIdentifier}
              onChange={(e) => setInviteIdentifier(e.target.value)}
              placeholder="Twitch логин или id: 1"
              className="min-w-0 flex-1 rounded-lg border border-gray-800 bg-black px-4 py-2 text-sm outline-none focus:border-purple-500"
            />
            <Button onClick={handleAssign} disabled={busy === 'assign' || !inviteIdentifier.trim()}>
              {busy === 'assign' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Назначить
            </Button>
          </div>
          {renderPermissionGroups(assignPerms, setAssignPerms)}
          <p className="text-xs text-gray-500">
            Модератор получает доступ сразу после назначения. Укажите Twitch логин или публичный id профиля.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-3 h-6 w-6 animate-spin" /> Загрузка
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="space-y-4">
            <h3 className="text-lg font-medium text-gray-100">Мои модераторы</h3>
            {asStreamer.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-[#161616] p-6 text-sm text-gray-500">
                У вас пока нет модераторов.
              </div>
            ) : (
              asStreamer.map((rel) => (
                <Card key={rel.id} className="border-gray-800 bg-[#161616]">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-100">{rel.moderatorName ?? 'Модератор'}</div>
                      <div className="truncate text-xs text-gray-500">@{rel.moderatorLogin ?? 'unknown'}</div>
                      <div className="mt-2"><Badge variant={statusVariant(rel.status)}>{statusLabel(rel.status)}</Badge></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => void openPermissionsModal(rel)} title="Настроить права">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleRevoke(rel.id)} disabled={busy === `revoke:${rel.id}`} title="Отозвать доступ">
                        <Trash className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-medium text-gray-100">Где я модератор</h3>
            {asModerator.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-[#161616] p-6 text-sm text-gray-500">
                Активных доступов нет.
              </div>
            ) : (
              asModerator.map((rel) => (
                <Card key={rel.id} className="border-gray-800 bg-[#161616]">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-100">{rel.streamerName ?? 'Стример'}</div>
                      <div className="truncate text-xs text-gray-500">@{rel.streamerLogin ?? 'unknown'}</div>
                      <div className="mt-2"><Badge variant={statusVariant(rel.status)}>{statusLabel(rel.status)}</Badge></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rel.status === 'active' && (
                        <>
                          <Button size="sm" onClick={() => void requestRemoteSession(rel)} disabled={busy === `session:${rel.id}`}>
                            {busy === `session:${rel.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MonitorPlay className="mr-2 h-4 w-4" />}
                            Запросить сессию
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void handleRevoke(rel.id)}>Отказаться</Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        </div>
      )}

      {managingPermsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-800 bg-[#161616] shadow-2xl">
            <div className="border-b border-gray-800 p-5">
              <h3 className="text-xl font-medium">Права доступа</h3>
              <p className="mt-1 text-sm text-gray-500">{managingPermsFor.moderatorName ?? 'Модератор'}</p>
            </div>
            <div className="p-5">
              {renderPermissionGroups(currentPerms, setCurrentPerms)}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-800 p-5">
              <Button variant="outline" onClick={() => setManagingPermsFor(null)}>Отмена</Button>
              <Button onClick={() => void savePermissions()} disabled={busy === `save:${managingPermsFor.id}`}>
                {busy === `save:${managingPermsFor.id}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
