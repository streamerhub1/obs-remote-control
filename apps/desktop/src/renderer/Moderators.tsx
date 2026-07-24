import React, { useEffect, useState } from 'react';
import { Shield, UserPlus, Trash, CheckCircle, XCircle } from 'lucide-react';

export function Moderators({
  onConnectRemote,
}: {
  onConnectRemote: (token: string) => void;
}) {
  const [asStreamer, setAsStreamer] = useState<any[]>([]);
  const [asModerator, setAsModerator] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [managingPermsFor, setManagingPermsFor] = useState<string | null>(null);
  const [currentPerms, setCurrentPerms] = useState<Record<string, boolean>>({});

  const fetchRelationships = async () => {
    try {
      const response = await window.desktop.api.relationships.list();
      if (response) {
        setAsStreamer(response.asStreamer);
        setAsModerator(response.asModerator);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, []);

  const handleInvite = async () => {
    if (!inviteIdentifier) return;
    try {
      const isCode = inviteIdentifier.toUpperCase().startsWith('PH-');
      const body = isCode
        ? { inviteCode: inviteIdentifier }
        : { twitchLogin: inviteIdentifier };

      await window.desktop.api.relationships.invite(body);
      setInviteIdentifier('');
      fetchRelationships();
    } catch (e: unknown) {
      alert('Failed to invite: ' + e.message);
      console.error(e);
    }
  };

  const handleRespond = async (id: string, action: 'accept' | 'reject') => {
    try {
      await window.desktop.api.relationships.respond(id, { action });
      fetchRelationships();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await window.desktop.api.relationships.revoke(id);
      fetchRelationships();
    } catch (e) {
      console.error(e);
    }
  };

  const openPermissionsModal = async (id: string) => {
    try {
      const perms = await window.desktop.api.relationships.getPermissions(id);
      const map: Record<string, boolean> = {};
      perms.forEach((p: unknown) => (map[p.permissionKey] = p.allowed));
      setCurrentPerms(map);
      setManagingPermsFor(id);
    } catch (e) {
      console.error(e);
    }
  };

  const savePermissions = async () => {
    if (!managingPermsFor) return;
    try {
      await window.desktop.api.relationships.setPermissions(managingPermsFor, {
        permissions: currentPerms,
      });
      alert('Permissions updated');
      setManagingPermsFor(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-semibold text-gray-100 flex items-center gap-3">
          <Shield className="text-blue-500" size={32} />
          Модераторы
        </h2>
        <p className="text-gray-400 mt-2">
          Управление доступом к вашему OBS и ваши права модератора.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Streamer Section: People I have invited */}
        <section className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
            <UserPlus size={24} className="text-purple-400" />
            Мои модераторы
          </h3>

          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={inviteIdentifier}
              onChange={(e) => setInviteIdentifier(e.target.value)}
              placeholder="Twitch логин или Invite Code (PH-...)"
              className="flex-1 bg-black border border-gray-800 rounded-lg px-4 py-2 text-sm focus:border-purple-500 outline-none"
            />
            <button
              onClick={handleInvite}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors border border-purple-500/50"
            >
              Пригласить
            </button>
          </div>

          <div className="space-y-4">
            {asStreamer.length === 0 && (
              <p className="text-gray-500 text-sm">
                У вас пока нет модераторов.
              </p>
            )}
            {asStreamer.map((rel) => (
              <div
                key={rel.id}
                className="p-4 bg-black/50 border border-gray-800 rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-200">
                    {rel.moderatorName}{' '}
                    <span className="text-gray-500 text-xs">
                      ({rel.moderatorLogin})
                    </span>
                  </div>
                  <div className="text-xs mt-1">
                    Статус:{' '}
                    <span
                      className={
                        rel.status === 'active'
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }
                    >
                      {rel.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {rel.status === 'active' && (
                    <button
                      onClick={() => openPermissionsModal(rel.id)}
                      className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 text-xs border border-blue-500/20"
                    >
                      Настроить доступ
                    </button>
                  )}
                  <button
                    onClick={() => handleRevoke(rel.id)}
                    className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Moderator Section: Streamers I moderate */}
        <section className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
            <Shield size={24} className="text-blue-400" />Я модератор
          </h3>

          <div className="space-y-4">
            {asModerator.length === 0 && (
              <p className="text-gray-500 text-sm">
                У вас пока нет приглашений.
              </p>
            )}
            {asModerator.map((rel) => (
              <div
                key={rel.id}
                className="p-4 bg-black/50 border border-gray-800 rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-200">
                    {rel.streamerName}{' '}
                    <span className="text-gray-500 text-xs">
                      ({rel.streamerLogin})
                    </span>
                  </div>
                  <div className="text-xs mt-1">
                    Статус:{' '}
                    <span
                      className={
                        rel.status === 'active'
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }
                    >
                      {rel.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {rel.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleRespond(rel.id, 'accept')}
                        className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        onClick={() => handleRespond(rel.id, 'reject')}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <XCircle size={20} />
                      </button>
                    </>
                  )}
                  {rel.status === 'active' && (
                    <>
                      <button
                        onClick={async () => {
                          try {
                            const data =
                              await window.desktop.api.remoteSessions.create({
                                relationshipId: rel.id,
                              });
                            if (data && data.authorizationToken) {
                              onConnectRemote(data.authorizationToken);
                            }
                          } catch (e: unknown) {
                            alert('Failed to connect: ' + e.message);
                          }
                        }}
                        className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 text-xs border border-blue-500/20"
                      >
                        Управлять OBS
                      </button>
                      <button
                        onClick={() => handleRevoke(rel.id)}
                        className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 text-xs border border-red-500/20"
                      >
                        Отказаться
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {managingPermsFor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-2xl max-w-lg w-full">
            <h3 className="text-xl font-medium mb-4">Настройка прав доступа</h3>
            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mb-6 text-sm">
              {[
                'scenes.read',
                'scenes.switch',
                'sceneItems.read',
                'sceneItems.visibility',
                'audio.read',
                'audio.mute',
                'audio.volume',
                'stream.read',
                'stream.start',
                'stream.stop',
                'record.read',
                'record.start',
                'record.stop',
                'obs.manage',
              ].map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={!!currentPerms[perm]}
                    onChange={(e) =>
                      setCurrentPerms({
                        ...currentPerms,
                        [perm]: e.target.checked,
                      })
                    }
                    className="rounded border-gray-700 text-purple-600 focus:ring-purple-500 bg-black"
                  />
                  <span>{perm}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                onClick={() => setManagingPermsFor(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={savePermissions}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
