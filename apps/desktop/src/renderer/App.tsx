import React from 'react';
import { Home, Shield, Link as LinkIcon, Settings, AlertCircle, Tv, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for classes (could be in a utils file)
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const version = window.electron?.appVersion || '1.0.0';

  const handleOpenLink = (url: string) => {
    if (window.electron?.openExternalUrl) {
      window.electron.openExternalUrl(url);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#111111] border-r border-gray-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            OBS Remote Control
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
            <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Не подключено</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={<Home size={20} />} label="Главная" active />
          <NavItem icon={<Shield size={20} />} label="Доступ" />
          <NavItem icon={<LinkIcon size={20} />} label="Подключения" />
          <NavItem icon={<Settings size={20} />} label="Настройки" />
        </nav>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 flex justify-between items-center">
          <span>v{version}</span>
          <button onClick={() => handleOpenLink('https://github.com/streamerhub1/obs-remote-control')} className="hover:text-gray-300 transition-colors">
            GitHub
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <header className="mb-10">
            <h2 className="text-3xl font-semibold text-gray-100">Панель управления</h2>
            <p className="text-gray-400 mt-2">Управляйте подключениями и выдавайте доступ модераторам.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Twitch Card */}
            <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Tv className="text-purple-400" size={24} />
                  </div>
                  <h3 className="text-lg font-medium">Аккаунт Twitch</h3>
                </div>
                <p className="text-gray-400 text-sm">
                  Для работы P2P-подключений и выдачи прав модераторам необходима авторизация через ваш Twitch-аккаунт.
                </p>
              </div>
              <button 
                disabled
                className="mt-6 w-full py-2.5 px-4 bg-purple-600/50 text-purple-200/50 rounded-lg font-medium cursor-not-allowed border border-purple-500/20 transition-all"
              >
                Будет подключено на следующем этапе
              </button>
            </div>

            {/* Status Cards */}
            <div className="space-y-6">
              <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-full">
                    <Activity className="text-red-400" size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-200">Состояние OBS</h4>
                    <p className="text-xs text-gray-500 mt-1">WebSocket отключён</p>
                  </div>
                </div>
                <button className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors text-gray-300">Настроить</button>
              </div>

              <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-full">
                    <Shield className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-200">P2P-сеть</h4>
                    <p className="text-xs text-gray-500 mt-1">Ожидание инициализации</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          {/* Recent Connections */}
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4 text-gray-200">Последние подключения</h3>
            <div className="bg-[#161616] border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
                <AlertCircle size={32} className="mb-3 opacity-50" />
                <p>Нет активных или недавних сессий.</p>
                <p className="text-sm mt-1">Авторизуйтесь через Twitch для начала работы.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a href="#" className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
      active 
        ? "bg-blue-600/10 text-blue-400" 
        : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
    )}>
      {icon}
      {label}
    </a>
  );
}

export default App;
