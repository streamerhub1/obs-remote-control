import React, { useEffect, useState } from 'react';
import { Shield, UserPlus, Trash, CheckCircle, XCircle } from 'lucide-react';

export function Moderators({ onConnectRemote }: { onConnectRemote: (token: string) => void }) {
  const [asStreamer, setAsStreamer] = useState<any[]>([]);
  const [asModerator, setAsModerator] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLogin, setInviteLogin] = useState('');

  const fetchRelationships = async () => {
    try {
      const token = await window.desktop.auth.getToken();
      const response = await fetch('http://localhost:3000/api/v1/relationships', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAsStreamer(data.asStreamer);
        setAsModerator(data.asModerator);
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
    if (!inviteLogin) return;
    try {
      const token = await window.desktop.auth.getToken();
      const response = await fetch('http://localhost:3000/api/v1/relationships/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ twitchLogin: inviteLogin })
      });
      if (response.ok) {
        setInviteLogin('');
        fetchRelationships();
      } else {
        const err = await response.json();
        alert('Failed to invite: ' + err.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRespond = async (id: string, action: 'accept' | 'reject') => {
    try {
      const token = await window.desktop.auth.getToken();
      await fetch(`http://localhost:3000/api/v1/relationships/${id}/respond`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ action })
      });
      fetchRelationships();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const token = await window.desktop.auth.getToken();
      await fetch(`http://localhost:3000/api/v1/relationships/${id}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRelationships();
    } catch (e) {
      console.error(e);
    }
  };

  const grantManagePermission = async (id: string, allowed: boolean) => {
    try {
      const token = await window.desktop.auth.getToken();
      await fetch(`http://localhost:3000/api/v1/relationships/${id}/permissions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ permissions: { 'obs.manage': allowed } })
      });
      alert('Permissions updated');
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
        <p className="text-gray-400 mt-2">Управление доступом к вашему OBS и ваши права модератора.</p>
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
              value={inviteLogin} 
              onChange={e => setInviteLogin(e.target.value)}
              placeholder="Twitch логин модератора" 
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
            {asStreamer.length === 0 && <p className="text-gray-500 text-sm">У вас пока нет модераторов.</p>}
            {asStreamer.map(rel => (
              <div key={rel.id} className="p-4 bg-black/50 border border-gray-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-200">{rel.moderatorName} <span className="text-gray-500 text-xs">({rel.moderatorLogin})</span></div>
                  <div className="text-xs mt-1">
                    Статус: <span className={rel.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>{rel.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {rel.status === 'active' && (
                     <>
                       <button onClick={() => grantManagePermission(rel.id, true)} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 text-xs border border-blue-500/20">Выдать доступ (obs.manage)</button>
                       <button onClick={() => grantManagePermission(rel.id, false)} className="px-3 py-1 bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/30 text-xs border border-gray-500/20">Забрать доступ</button>
                     </>
                  )}
                  <button onClick={() => handleRevoke(rel.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
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
            <Shield size={24} className="text-blue-400" />
            Я модератор
          </h3>

          <div className="space-y-4">
            {asModerator.length === 0 && <p className="text-gray-500 text-sm">У вас пока нет приглашений.</p>}
            {asModerator.map(rel => (
              <div key={rel.id} className="p-4 bg-black/50 border border-gray-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-200">{rel.streamerName} <span className="text-gray-500 text-xs">({rel.streamerLogin})</span></div>
                  <div className="text-xs mt-1">
                    Статус: <span className={rel.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>{rel.status}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {rel.status === 'pending' && (
                    <>
                      <button onClick={() => handleRespond(rel.id, 'accept')} className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors">
                        <CheckCircle size={20} />
                      </button>
                      <button onClick={() => handleRespond(rel.id, 'reject')} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                        <XCircle size={20} />
                      </button>
                    </>
                  )}
                  {rel.status === 'active' && (
                    <>
                      <button onClick={async () => {
                        const token = await window.desktop.auth.getToken();
                        const res = await fetch(`http://localhost:3000/api/v1/remote-sessions`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ relationshipId: rel.id })
                        });
                        if (res.ok) {
                          const data = await res.json();
                          onConnectRemote(data.authorizationToken);
                        } else {
                          const err = await res.json();
                          alert('Failed to connect: ' + err.error);
                        }
                      }} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 text-xs border border-blue-500/20">
                        Управлять OBS
                      </button>
                      <button onClick={() => handleRevoke(rel.id)} className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 text-xs border border-red-500/20">
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
    </div>
  );
}
