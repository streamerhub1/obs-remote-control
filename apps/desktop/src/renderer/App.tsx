import React from 'react';
import {
  Home as HomeIcon,
  Shield,
  Activity,
  Tv,
  MonitorPlay,
  Globe,
  Rss,
  Users,
  Calendar as CalendarIcon,
  Bell,
  User,
  Settings as SettingsIcon,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ObsDashboard } from './ObsDashboard';
import { LocalObsDataSource, RemoteObsDataSource } from './data-sources';
import { WebSocketRelayTransport } from './transports/WebSocketRelayTransport';
import { Moderators } from './Moderators';
import { Feed } from './Feed';
import { Collabs } from './Collabs';
import { Calendar } from './Calendar';
import { Profile } from './Profile';
import { Notifications } from './Notifications';
import { Settings } from './Settings';
import { Home as HomeView } from './Home';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
      active 
        ? "bg-blue-600/10 text-blue-400" 
        : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
    )}>
      {icon}
      {label}
    </div>
  );
}

export default function App() {
  const version = window.desktop?.appVersion || '1.0.0';

  const [authLoading, setAuthLoading] = React.useState(true);
  const [authenticated, setAuthenticated] = React.useState(false);

  const [obsState, setObsState] = React.useState<string>('disconnected');
  const [obsHost, setObsHost] = React.useState('127.0.0.1');
  const [obsPort, setObsPort] = React.useState(4455);
  const [obsPassword, setObsPassword] = React.useState('');
  
  const [currentRoute, setCurrentRoute] = React.useState<'home'|'feed'|'collabs'|'calendar'|'my_obs'|'remote_obs'|'moderators'|'notifications'|'profile'|'settings'>('home');
  const [obsSettingsOpen, setObsSettingsOpen] = React.useState(false);

  const [localObsDataSource] = React.useState(() => new LocalObsDataSource());
  const [remoteObsDataSource, setRemoteObsDataSource] = React.useState<RemoteObsDataSource | null>(null);

  const [incomingSession, setIncomingSession] = React.useState<any>(null);

  React.useEffect(() => {
    if (!window.desktop?.auth) return;
    window.desktop.auth.getState().then((state: any) => {
      setAuthenticated(state.authenticated);
      setAuthLoading(false);
    });
    return window.desktop.auth.subscribe((state: any) => {
      if (state.loading !== undefined) setAuthLoading(state.loading);
      if (state.authenticated !== undefined) setAuthenticated(state.authenticated);
    });
  }, []);

  React.useEffect(() => {
    if (!window.desktop?.obs) return;
    const cleanup = window.desktop.obs.subscribe((event: any) => {
      setObsState(event.state);
    });
    window.desktop.obs.getStatus().then(setObsState);
    return cleanup;
  }, []);

  React.useEffect(() => {
    if (!window.desktop?.remoteSessions) return;
    
    // Connect to global signaling for presence when authenticated
    if (authenticated) {
      window.desktop.signaling.connect();
    }

    const cleanupIncoming = window.desktop.remoteSessions.onIncoming((session: any) => {
      console.log('Incoming session', session);
      setIncomingSession(session);
    });

    return () => {
      cleanupIncoming();
    };
  }, [authenticated]);

  const acceptSession = async () => {
    if (!incomingSession) return;
    const sessionInfo = incomingSession;
    setIncomingSession(null);
    
    try {
      // 1. Authenticate with backend and verify token in Main
      const ctx = await window.desktop.remoteSessions.connect(sessionInfo.streamerAuthorization);
      
      // 2. Start WebSocket Relay Transport
      const transport = new WebSocketRelayTransport('ws://localhost:3000/api/v1/signaling/session');
      await transport.connect({
        remoteSessionId: ctx.remoteSessionId,
        role: 'streamer',
        streamerAuthorization: sessionInfo.streamerAuthorization
      });

      // Broadcast OBS snapshot when connected
      const cleanupObsEvent = window.desktop.obs.subscribe((event: any) => {
        if (event.state === 'connected' && event.snapshot) {
           transport.send({ type: 'snapshot', payload: event.snapshot });
        }
      });

      // Handle incoming commands from the transport and pass them to the secure Main guard
      const unsubTransport = transport.subscribe(async (msg: any) => {
        if (msg.type === 'command.request') {
          try {
            const result = await window.desktop.remoteSessions.executeCommand(ctx.remoteSessionId, {
              command: msg.payload.command.commandName,
              args: msg.payload.command.commandData,
              seq: 0 // Mock sequence for now
            });
            transport.send({
              type: 'command.response',
              payload: {
                commandId: msg.payload.commandId,
                status: result.status,
                data: result.data,
              }
            });
          } catch (e: any) {
             transport.send({
              type: 'command.response',
              payload: {
                commandId: msg.payload.commandId,
                status: 'error',
                error: e.message,
              }
            });
          }
        }
      });

      // Cleanup logic should be stored if we want to cancel the session later
    } catch (e: any) {
      console.error('Failed to accept session', e);
      alert('Failed to connect: ' + e.message);
    }
  };

  const handleTwitchLogin = () => window.desktop?.auth?.login();
  const handleLogout = () => window.desktop?.auth?.logout();

  const handleConnectOBS = async () => {
    if (!window.desktop?.obs) return;
    setObsState('connecting');
    await window.desktop.obs.connect({ host: obsHost, port: obsPort, password: obsPassword });
  };

  const startRemoteSession = async (directToken?: string) => {
    // Session is started via Moderators UI which always provides a token
    const token = directToken;
    if (!token) return;
    
    try {
      const ctx = await window.desktop.remoteSessions.connect(token);
      
      const transport = new WebSocketRelayTransport('ws://localhost:3000/api/v1/signaling/session');
      await transport.connect({
        remoteSessionId: ctx.remoteSessionId,
        role: 'moderator',
        moderatorAuthorization: token
      });
      
      setRemoteObsDataSource(new RemoteObsDataSource(transport));
      setCurrentRoute('remote_obs');
    } catch (e: any) {
      alert('Failed to connect to session: ' + e.message);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col h-screen w-screen bg-[#0A0A0A] text-white items-center justify-center drag-region">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse mb-4">
          StreamerHub
        </h1>
        <div className="text-gray-500 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-screen w-screen bg-[#0A0A0A] text-white items-center justify-center drag-region">
        <div className="bg-[#161616] border border-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center no-drag">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
            StreamerHub
          </h1>
          <p className="text-gray-400 text-sm mb-8">Единый центр управления стримами, коллаборациями и сообществом.</p>
          <button 
            onClick={handleTwitchLogin}
            className="w-full py-3 px-4 bg-[#9146FF] hover:bg-[#772CE8] text-white rounded-xl font-semibold transition-all shadow-lg shadow-[#9146FF]/20 flex items-center justify-center gap-2"
          >
            <Tv size={20} />
            Войти через Twitch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#0A0A0A] text-white font-sans overflow-hidden drag-region">
      <aside className="w-64 bg-[#111111] border-r border-gray-800 flex flex-col no-drag">
        <div className="p-6 drag-region">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent pointer-events-none">
            StreamerHub
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-gray-500 mb-2 mt-4 px-3 uppercase tracking-wider">Социальное</div>
          <NavItem icon={<HomeIcon size={20} />} label="Главная" active={currentRoute === 'home'} onClick={() => setCurrentRoute('home')} />
          <NavItem icon={<Rss size={20} />} label="Лента" active={currentRoute === 'feed'} onClick={() => setCurrentRoute('feed')} />
          <NavItem icon={<Users size={20} />} label="Коллаборации" active={currentRoute === 'collabs'} onClick={() => setCurrentRoute('collabs')} />
          <NavItem icon={<CalendarIcon size={20} />} label="Календарь" active={currentRoute === 'calendar'} onClick={() => setCurrentRoute('calendar')} />

          <div className="text-xs font-semibold text-gray-500 mb-2 mt-6 px-3 uppercase tracking-wider">Студия</div>
          <NavItem icon={<MonitorPlay size={20} />} label="Мой OBS" active={currentRoute === 'my_obs'} onClick={() => setCurrentRoute('my_obs')} />
          <NavItem icon={<Globe size={20} />} label="Доступные OBS" active={currentRoute === 'remote_obs'} onClick={() => setCurrentRoute('remote_obs')} />
          <NavItem icon={<Shield size={20} />} label="Модераторы" active={currentRoute === 'moderators'} onClick={() => setCurrentRoute('moderators')} />
          
          <div className="text-xs font-semibold text-gray-500 mb-2 mt-6 px-3 uppercase tracking-wider">Аккаунт</div>
          <NavItem icon={<Bell size={20} />} label="Уведомления" active={currentRoute === 'notifications'} onClick={() => setCurrentRoute('notifications')} />
          <NavItem icon={<User size={20} />} label="Профиль" active={currentRoute === 'profile'} onClick={() => setCurrentRoute('profile')} />
          <NavItem icon={<SettingsIcon size={20} />} label="Настройки" active={currentRoute === 'settings'} onClick={() => setCurrentRoute('settings')} />
        </nav>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          <span>v{version}</span>
        </div>
      </aside>

      {/* Incoming Session Overlay */}
      {incomingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161616] border border-gray-700 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Входящий запрос на управление</h3>
            <p className="text-gray-400 mb-6">Модератор пытается подключиться к вашему OBS.</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setIncomingSession(null)} className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">Отклонить</button>
              <button onClick={acceptSession} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all">Разрешить</button>
            </div>
          </div>
        </div>
      )}

      {/* Title Bar drag region for Windows when app is mostly no-drag */}
      <div className="absolute top-0 left-0 right-0 h-8 drag-region pointer-events-none" />

      <main className="flex-1 overflow-y-auto p-8 pt-12 no-drag">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {currentRoute === 'my_obs' && (
            <>
              <header>
                <h2 className="text-3xl font-semibold text-gray-100">Мой OBS</h2>
                <p className="text-gray-400 mt-2">Локальное управление вашим OBS Studio.</p>
              </header>

              <div className="max-w-md mx-auto">
                <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Activity size={20} className={obsState === 'connected' ? 'text-green-400' : 'text-red-400'}/> Подключение OBS Studio</h3>
                  {obsState === 'connected' ? (
                    <div className="space-y-4">
                      <div className="py-2 px-4 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20 text-center">Успешно подключено к OBS</div>
                      <button onClick={() => window.desktop.obs.disconnect()} className="w-full py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors border border-red-500/20">Отключиться</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-gray-400 text-sm mb-4">Нажмите кнопку ниже для подключения к локальному OBS Studio с параметрами по умолчанию (127.0.0.1:4455).</p>
                      <button onClick={handleConnectOBS} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors shadow-lg shadow-blue-500/20">Подключить OBS</button>
                      
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <button onClick={() => setObsSettingsOpen(!obsSettingsOpen)} className="text-sm text-gray-500 hover:text-gray-300">Расширенные настройки</button>
                        {obsSettingsOpen && (
                          <div className="space-y-3 mt-3">
                            <div className="flex gap-3">
                              <input type="text" value={obsHost} onChange={(e) => setObsHost(e.target.value)} placeholder="IP" className="flex-1 bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                              <input type="number" value={obsPort} onChange={(e) => setObsPort(parseInt(e.target.value))} placeholder="Port" className="w-24 bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <input type="password" value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} placeholder="Пароль (опционально)" className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {obsState === 'connected' && <ObsDashboard dataSource={localObsDataSource} />}
            </>
          )}

          {currentRoute === 'remote_obs' && (
            <>
              <header>
                <h2 className="text-3xl font-semibold text-gray-100">Удаленный OBS</h2>
                <p className="text-gray-400 mt-2">Управление OBS стримера через WebSocket Relay.</p>
              </header>

              {!remoteObsDataSource ? (
                <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg text-center">
                   <p className="text-gray-400 mb-4">Вы не подключены к удаленному сеансу.</p>
                   <p className="text-sm text-gray-500">Удаленная сессия создается через раздел "Модераторы".</p>
                </div>
              ) : (
                <ObsDashboard dataSource={remoteObsDataSource} />
              )}
            </>
          )}

          {currentRoute === 'home' && (
             <HomeView obsState={obsState} navigate={setCurrentRoute as any} />
          )}

          {currentRoute === 'feed' && <Feed />}
          {currentRoute === 'collabs' && <Collabs />}
          {currentRoute === 'calendar' && <Calendar />}
          {currentRoute === 'profile' && <Profile />}
          {currentRoute === 'notifications' && <Notifications />}
          {currentRoute === 'settings' && <Settings />}

          {currentRoute === 'moderators' && <Moderators onConnectRemote={startRemoteSession} />}

        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  );
}
