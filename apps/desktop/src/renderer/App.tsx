import React from 'react';
import { Home, Shield, Activity, Tv, MonitorPlay, Video, Volume2, VolumeX, Mic, Layers, PlaySquare, Eye, EyeOff, Pause, Square } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const version = window.desktop?.appVersion || '1.0.0';

  const [authLoading, setAuthLoading] = React.useState(true);
  const [authenticated, setAuthenticated] = React.useState(false);

  const [obsState, setObsState] = React.useState<string>('disconnected');
  const [obsHost, setObsHost] = React.useState('127.0.0.1');
  const [obsPort, setObsPort] = React.useState(4455);
  const [obsPassword, setObsPassword] = React.useState('');
  
  const [snapshot, setSnapshot] = React.useState<any>(null);
  const [obsError, setObsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!window.desktop?.auth) return;

    window.desktop.auth.getState().then((state) => {
      setAuthenticated(state.authenticated);
      setAuthLoading(false);
    });

    const cleanup = window.desktop.auth.subscribe((state) => {
      if (state.error) {
        console.error('Auth Error:', state.error);
      } else if (state.loading !== undefined) {
        setAuthLoading(state.loading);
      } else if (state.authenticated !== undefined) {
        setAuthenticated(state.authenticated);
      }
    });

    return cleanup;
  }, []);

  React.useEffect(() => {
    if (!window.desktop?.obs) return;

    const cleanup = window.desktop.obs.subscribe((event) => {
      setObsState(event.state);
      setSnapshot(event.snapshot);
      if (event.state === 'error') {
        setObsError('Connection error or invalid password');
      } else {
        setObsError(null);
      }
    });

    window.desktop.obs.getStatus().then((state) => {
      setObsState(state);
      if (state === 'connected') {
        window.desktop.obs.getSnapshot().then(setSnapshot);
      }
    });

    return cleanup;
  }, []);

  const handleTwitchLogin = () => {
    window.desktop?.auth?.login();
  };

  const handleLogout = () => {
    window.desktop?.auth?.logout();
  };

  const handleConnectOBS = async () => {
    if (!window.desktop?.obs) return;
    setObsState('connecting');
    setObsError(null);
    const success = await window.desktop.obs.connect({
      host: obsHost,
      port: obsPort,
      password: obsPassword
    });
    setObsPassword(''); // clear password from state
    if (!success) {
      setObsError('Failed to connect. Check port and password.');
    }
  };

  const handleDisconnectOBS = async () => {
    if (!window.desktop?.obs) return;
    await window.desktop.obs.disconnect();
  };

  const execute = (command: any) => {
    window.desktop?.obs?.execute(command);
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
          <NavItem icon={<Home size={20} />} label="Главная" />
          <NavItem icon={<MonitorPlay size={20} />} label="Мой OBS" active />
          <NavItem icon={<Shield size={20} />} label="Доступ" />
        </nav>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          <span>v{version}</span>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
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
                  <div className="py-2 px-4 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20">
                    Подключено к OBS
                  </div>
                  <button onClick={handleDisconnectOBS} className="w-full py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors border border-red-500/20">Отключиться</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input type="text" value={obsHost} onChange={(e) => setObsHost(e.target.value)} placeholder="IP (127.0.0.1)" className="flex-1 bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                    <input type="number" value={obsPort} onChange={(e) => setObsPort(parseInt(e.target.value))} placeholder="Port (4455)" className="w-24 bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                  </div>
                  <input type="password" value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} placeholder="WebSocket Password" className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                  <button onClick={handleConnectOBS} className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors border border-blue-500/50">
                    {obsState === 'connecting' ? 'Подключение...' : 'Подключить'}
                  </button>
                  {obsError && <p className="text-red-400 text-xs text-center mt-2">{obsError}</p>}
                </div>
              )}
            </div>
          </div>

          {obsState === 'connected' && !snapshot && (
             <div className="p-8 text-center text-gray-500 animate-pulse">Загрузка состояния OBS...</div>
          )}

          {snapshot && (
            <div className="space-y-6">
              
              <div className="flex flex-wrap gap-4">
                 <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1 min-w-[200px]">
                   <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Версия</h4>
                   <p className="font-medium text-sm">{snapshot.obsVersion} / WS {snapshot.websocketVersion}</p>
                 </div>
                 <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1 min-w-[200px]">
                   <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide flex justify-between">
                      Трансляция
                      {snapshot.streamStatus?.active ? <PlaySquare size={14} className="text-red-400"/> : <Square size={14} />}
                   </h4>
                   <p className={cn("font-medium", snapshot.streamStatus?.active ? "text-red-400" : "text-gray-300")}>
                     {snapshot.streamStatus?.active ? `В эфире: ${snapshot.streamStatus.timecode}` : 'Остановлена'}
                   </p>
                 </div>
                 <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1 min-w-[200px]">
                   <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide flex justify-between">
                      Запись
                      {snapshot.recordStatus?.active ? <PlaySquare size={14} className="text-red-400"/> : <Square size={14} />}
                   </h4>
                   <p className={cn("font-medium", snapshot.recordStatus?.active ? "text-red-400" : "text-gray-300")}>
                     {snapshot.recordStatus?.active ? `Идет запись: ${snapshot.recordStatus.timecode}` : 'Остановлена'}
                   </p>
                 </div>
                 <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 flex-1 min-w-[200px]">
                   <h4 className="text-gray-500 text-xs mb-1 uppercase tracking-wide">Студийный Режим</h4>
                   <p className="font-medium">{snapshot.studioMode ? 'Включен' : 'Выключен'}</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Сцены */}
                <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col h-[400px]">
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Video size={20} className="text-blue-400"/> Сцены</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {snapshot.scenes?.length > 0 ? snapshot.scenes.map((sceneName: string) => {
                      const isActive = sceneName === snapshot.currentProgramScene;
                      return (
                        <button
                          key={sceneName}
                          onClick={() => execute({ type: 'scene.setCurrentProgram', payload: { sceneName } })}
                          className={cn(
                            "w-full py-3 px-4 rounded-lg text-sm font-medium border transition-all text-left truncate",
                            isActive ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-black border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                          )}
                        >
                          {sceneName}
                        </button>
                      )
                    }) : <p className="text-sm text-gray-500 text-center mt-10">Сцены не найдены</p>}
                  </div>
                </div>

                {/* Источники текущей сцены */}
                <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col h-[400px]">
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Layers size={20} className="text-purple-400"/> Источники ({snapshot.currentProgramScene})</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {snapshot.sceneItems?.[snapshot.currentProgramScene]?.length > 0 ? 
                      snapshot.sceneItems[snapshot.currentProgramScene].map((item: any) => (
                        <div key={item.sceneItemId} className="flex items-center justify-between p-3 bg-black border border-gray-800 rounded-lg">
                          <span className="text-sm truncate mr-2" title={item.sourceName}>{item.sourceName}</span>
                          <button 
                            onClick={() => execute({ type: 'sceneItem.setEnabled', payload: { sceneName: snapshot.currentProgramScene, sceneItemId: item.sceneItemId, enabled: !item.sceneItemEnabled }})}
                            className={cn("p-1.5 rounded-md hover:bg-gray-800 transition-colors", item.sceneItemEnabled ? "text-gray-300" : "text-gray-600")}
                          >
                            {item.sceneItemEnabled ? <Eye size={16}/> : <EyeOff size={16}/>}
                          </button>
                        </div>
                      ))
                    : <p className="text-sm text-gray-500 text-center mt-10">Нет источников</p>}
                  </div>
                </div>

                {/* Микшер аудио */}
                <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col h-[400px]">
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4"><Mic size={20} className="text-green-400"/> Микшер аудио</h3>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {Object.keys(snapshot.audioMixer || {}).length > 0 ? 
                      Object.keys(snapshot.audioMixer).map(inputName => {
                        const audio = snapshot.audioMixer[inputName];
                        const filters = snapshot.filters?.[inputName] || [];
                        return (
                          <div key={inputName} className="p-3 bg-black border border-gray-800 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium truncate flex-1">{inputName}</span>
                              <button 
                                onClick={() => execute({ type: 'input.setMute', payload: { inputName, muted: !audio.muted }})}
                                className={cn("p-1.5 rounded-md hover:bg-gray-800 transition-colors ml-2", audio.muted ? "text-red-400" : "text-gray-300")}
                              >
                                {audio.muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <input 
                                type="range" 
                                min="-100" max="0" 
                                value={Math.max(-100, Math.min(0, audio.volumeDb))} 
                                onChange={(e) => execute({ type: 'input.setVolume', payload: { inputName, volumeDb: parseFloat(e.target.value) }})}
                                className="flex-1 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-xs text-gray-500 w-12 text-right">{audio.volumeDb.toFixed(1)} dB</span>
                            </div>
                            {filters.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-800">
                                <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Фильтры</p>
                                <div className="flex flex-wrap gap-1">
                                  {filters.map((f: any) => (
                                    <span key={f.filterName} className={cn("text-[10px] px-1.5 py-0.5 rounded", f.filterEnabled ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-600 line-through")}>
                                      {f.filterName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    : <p className="text-sm text-gray-500 text-center mt-10">Нет аудио входов</p>}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
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
