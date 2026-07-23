import React from 'react';
import { Home, Shield, Settings, Activity, Tv, MonitorPlay, Video, Volume2, VolumeX } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const version = window.electron?.appVersion || '1.0.0';

  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);

  const [obsState, setObsState] = React.useState<string>('disconnected');
  const [obsHost, setObsHost] = React.useState('127.0.0.1');
  const [obsPort, setObsPort] = React.useState(4455);
  const [obsPassword, setObsPassword] = React.useState('');
  
  const [snapshot, setSnapshot] = React.useState<any>(null);

  React.useEffect(() => {
    if (!window.electron?.auth) return;

    const cleanup = window.electron.auth.onCallback(async (code) => {
      try {
        setIsLoggingIn(true);
        const publicKey = await window.electron.auth.getKeys();
        
        const response = await fetch('http://localhost:3000/api/auth/desktop/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            publicKey,
            deviceName: window.electron.platform + ' Device',
            platform: window.electron.platform,
            appVersion: window.electron.appVersion,
          })
        });

        if (!response.ok) throw new Error('Failed to exchange code');
        const data = await response.json();
        
        await window.electron.auth.storeRefreshToken(data.refreshToken);
        setToken(data.accessToken);
      } catch (err) {
        console.error('Login error:', err);
      } finally {
        setIsLoggingIn(false);
      }
    });

    return cleanup;
  }, []);

  // OBS Polling (for snapshot)
  React.useEffect(() => {
    if (!window.electron?.obs) return;

    const interval = setInterval(async () => {
      const state = await window.electron.obs.getStatus();
      setObsState(state);

      if (state === 'connected') {
        const data = await window.electron.obs.getSnapshot();
        if (data) setSnapshot(data);
      } else {
        setSnapshot(null);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleTwitchLogin = () => {
    window.electron?.auth?.login();
  };

  const handleConnectOBS = async () => {
    if (!window.electron?.obs) return;
    setObsState('connecting');
    await window.electron.obs.connect({
      host: obsHost,
      port: obsPort,
      password: obsPassword
    });
  };

  const handleDisconnectOBS = async () => {
    if (!window.electron?.obs) return;
    await window.electron.obs.disconnect();
  };

  const setScene = async (sceneName: string) => {
    if (!window.electron?.obs) return;
    await window.electron.obs.execute({ type: 'SetCurrentProgramScene', payload: { sceneName } });
    // Force immediate refresh
    const data = await window.electron.obs.getSnapshot();
    if (data) setSnapshot(data);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#111111] border-r border-gray-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            OBS Remote Control
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={<Home size={20} />} label="Главная" active />
          <NavItem icon={<MonitorPlay size={20} />} label="Мой OBS" />
          <NavItem icon={<Shield size={20} />} label="Доступ" />
        </nav>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          <span>v{version}</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header>
            <h2 className="text-3xl font-semibold text-gray-100">Мой OBS</h2>
            <p className="text-gray-400 mt-2">Локальное управление вашим OBS Studio.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Twitch Auth Card */}
            <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-2"><Tv size={20} className="text-purple-400"/> Авторизация Twitch</h3>
              <p className="text-gray-400 text-sm mb-4">Для работы P2P требуется вход в систему.</p>
              
              {token ? (
                <div className="py-2 px-4 bg-green-500/10 text-green-400 rounded-lg font-medium border border-green-500/20 text-center">Авторизован</div>
              ) : (
                <button 
                  onClick={handleTwitchLogin}
                  disabled={isLoggingIn}
                  className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium border border-purple-500/50 transition-all disabled:opacity-50"
                >
                  {isLoggingIn ? 'Вход...' : 'Войти через Twitch'}
                </button>
              )}
            </div>

            {/* OBS Connection Setup */}
            <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Activity size={20} className={obsState === 'connected' ? 'text-green-400' : 'text-red-400'}/> Подключение OBS</h3>
              
              {obsState === 'connected' ? (
                <div className="space-y-4">
                  <div className="py-2 px-4 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20">
                    Подключено к OBS WebSocket
                  </div>
                  <button onClick={handleDisconnectOBS} className="w-full py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors border border-red-500/20">Отключиться</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input type="text" value={obsHost} onChange={(e) => setObsHost(e.target.value)} placeholder="IP (127.0.0.1)" className="flex-1 bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                    <input type="number" value={obsPort} onChange={(e) => setObsPort(parseInt(e.target.value))} placeholder="Port (4455)" className="w-24 bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                  </div>
                  <input type="password" value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} placeholder="WebSocket Password (optional)" className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                  <button onClick={handleConnectOBS} className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors border border-blue-500/50">
                    {obsState === 'connecting' ? 'Подключение...' : 'Подключить OBS'}
                  </button>
                  {obsState === 'error' && <p className="text-red-400 text-xs text-center mt-2">Ошибка подключения. Проверьте пароль и порт.</p>}
                </div>
              )}
            </div>
          </div>

          {/* OBS Snapshot Data UI */}
          {snapshot && (
            <div className="space-y-6">
              
              {/* Snapshot Headers */}
              <div className="flex gap-4">
                 <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1">
                   <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Версия OBS</h4>
                   <p className="font-medium">{snapshot.obsVersion}</p>
                 </div>
                 <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1">
                   <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Трансляция</h4>
                   <p className={cn("font-medium", snapshot.streamStatus?.active ? "text-red-400" : "text-gray-300")}>
                     {snapshot.streamStatus?.active ? `В эфире: ${snapshot.streamStatus.timecode}` : 'Остановлена'}
                   </p>
                 </div>
                 <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1">
                   <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Запись</h4>
                   <p className={cn("font-medium", snapshot.recordStatus?.active ? "text-red-400" : "text-gray-300")}>
                     {snapshot.recordStatus?.active ? `Запись: ${snapshot.recordStatus.timecode}` : 'Остановлена'}
                   </p>
                 </div>
              </div>

              {/* Scenes Management */}
              <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Video size={20} className="text-blue-400"/> Управление Сценами</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {snapshot.scenes?.map((sceneName: string) => {
                    const isActive = sceneName === snapshot.currentProgramScene;
                    return (
                      <button
                        key={sceneName}
                        onClick={() => setScene(sceneName)}
                        className={cn(
                          "py-3 px-4 rounded-lg text-sm font-medium border transition-all text-left truncate",
                          isActive ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-black border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                        )}
                      >
                        {sceneName}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={cn(
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

export default App;
