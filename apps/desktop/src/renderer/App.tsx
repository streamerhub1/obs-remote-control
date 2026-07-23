import React from 'react';
import { Home, Shield, Activity, Tv, MonitorPlay, Layers, Globe } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ObsDashboard } from './ObsDashboard';
import { LocalObsDataSource, RemoteObsDataSource } from './data-sources';
import { WebRTCManager } from './webrtc';

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
  
  const [currentRoute, setCurrentRoute] = React.useState<'home'|'my_obs'|'remote_obs'>('my_obs');

  const [localObsDataSource] = React.useState(() => new LocalObsDataSource());
  const [remoteObsDataSource, setRemoteObsDataSource] = React.useState<RemoteObsDataSource | null>(null);

  React.useEffect(() => {
    if (!window.desktop?.auth) return;
    window.desktop.auth.getState().then((state) => {
      setAuthenticated(state.authenticated);
      setAuthLoading(false);
    });
    return window.desktop.auth.subscribe((state) => {
      if (state.loading !== undefined) setAuthLoading(state.loading);
      if (state.authenticated !== undefined) setAuthenticated(state.authenticated);
    });
  }, []);

  React.useEffect(() => {
    if (!window.desktop?.obs) return;
    const cleanup = window.desktop.obs.subscribe((event) => {
      setObsState(event.state);
    });
    window.desktop.obs.getStatus().then(setObsState);
    return cleanup;
  }, []);

  React.useEffect(() => {
    // When streamer is authenticated and local OBS is connected, establish WebRTC manager in receiver mode
    if (authenticated && obsState === 'connected' && window.desktop?.signaling) {
      window.desktop.signaling.connect();
      
      const webrtc = new WebRTCManager(
        'streamer',
        null, // Streamer gets authorization dynamically or via signaling
        (cmd) => window.desktop.obs.execute(cmd),
        () => window.desktop.obs.getSnapshot(),
        (msg) => window.desktop.signaling.send(msg),
        (cb) => window.desktop.signaling.subscribe(cb)
      );
      
      webrtc.connect();

      const cleanupObsEvent = window.desktop.obs.subscribe((event) => {
        if (event.state === 'connected' && event.snapshot) {
           // event is not sent as patch here currently, full logic would sync it
           webrtc.broadcastEvent({ type: 'snapshot', payload: event.snapshot });
        }
      });

      return () => {
        webrtc.destroy();
        cleanupObsEvent();
      };
    }
  }, [authenticated, obsState]);

  const handleTwitchLogin = () => window.desktop?.auth?.login();
  const handleLogout = () => window.desktop?.auth?.logout();

  const handleConnectOBS = async () => {
    if (!window.desktop?.obs) return;
    setObsState('connecting');
    await window.desktop.obs.connect({ host: obsHost, port: obsPort, password: obsPassword });
  };

  const startRemoteSession = () => {
    // For demo/manual test, moderator clicks this and inputs a mock auth token
    const token = prompt("Enter RemoteSessionAuthorization Token from Backend:");
    if (!token) return;
    
    window.desktop.signaling.connect();
    const webrtc = new WebRTCManager(
      'moderator',
      token,
      async () => {}, // unused for moderator
      async () => {}, // unused
      (msg) => window.desktop.signaling.send(msg),
      (cb) => window.desktop.signaling.subscribe(cb)
    );
    webrtc.connect();
    setRemoteObsDataSource(new RemoteObsDataSource(webrtc));
    setCurrentRoute('remote_obs');
  };

  return (
    <div className="flex h-screen w-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      <aside className="w-64 bg-[#111111] border-r border-gray-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            OBS Remote Control
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={<Home size={20} />} label="Главная" active={currentRoute === 'home'} onClick={() => setCurrentRoute('home')} />
          <NavItem icon={<MonitorPlay size={20} />} label="Мой OBS" active={currentRoute === 'my_obs'} onClick={() => setCurrentRoute('my_obs')} />
          <NavItem icon={<Globe size={20} />} label="Удаленный OBS" active={currentRoute === 'remote_obs'} onClick={() => setCurrentRoute('remote_obs')} />
          <NavItem icon={<Shield size={20} />} label="Доступ" active={false} onClick={() => {}} />
        </nav>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          <span>v{version}</span>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {currentRoute === 'my_obs' && (
            <>
              <header>
                <h2 className="text-3xl font-semibold text-gray-100">Мой OBS</h2>
                <p className="text-gray-400 mt-2">Локальное управление вашим OBS Studio.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-2"><Tv size={20} className="text-purple-400"/> Аккаунт Twitch</h3>
                  <p className="text-gray-400 text-sm mb-4">Авторизация для P2P-координатора.</p>
                  
                  {authLoading ? (
                    <div className="animate-pulse h-10 bg-gray-800 rounded-lg"></div>
                  ) : authenticated ? (
                    <div className="flex gap-2">
                      <div className="flex-1 py-2 px-4 bg-green-500/10 text-green-400 rounded-lg font-medium border border-green-500/20 text-center">Устройство авторизовано</div>
                      <button onClick={handleLogout} className="py-2 px-4 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors border border-red-500/20">Выйти</button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleTwitchLogin}
                      className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium border border-purple-500/50 transition-all"
                    >
                      Войти через Twitch
                    </button>
                  )}
                </div>

                <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Activity size={20} className={obsState === 'connected' ? 'text-green-400' : 'text-red-400'}/> Подключение OBS</h3>
                  {obsState === 'connected' ? (
                    <div className="space-y-4">
                      <div className="py-2 px-4 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20">Подключено к OBS</div>
                      <button onClick={() => window.desktop.obs.disconnect()} className="w-full py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors border border-red-500/20">Отключиться</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input type="text" value={obsHost} onChange={(e) => setObsHost(e.target.value)} placeholder="IP" className="flex-1 bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                        <input type="number" value={obsPort} onChange={(e) => setObsPort(parseInt(e.target.value))} placeholder="Port" className="w-24 bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                      </div>
                      <input type="password" value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} placeholder="Password" className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                      <button onClick={handleConnectOBS} className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors border border-blue-500/50">Подключить</button>
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
                <p className="text-gray-400 mt-2">Управление OBS стримера через P2P соединение.</p>
              </header>

              {!remoteObsDataSource ? (
                <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg text-center">
                   <p className="text-gray-400 mb-4">Вы не подключены к удаленному сеансу.</p>
                   <button onClick={startRemoteSession} className="py-2 px-6 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors border border-blue-500/50">
                     Установить P2P Сессию
                   </button>
                </div>
              ) : (
                <ObsDashboard dataSource={remoteObsDataSource} />
              )}
            </>
          )}

          {currentRoute === 'home' && (
             <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-medium mb-4">Главная</h3>
                <p className="text-gray-400">Добро пожаловать в OBS Remote Control.</p>
             </div>
          )}

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
