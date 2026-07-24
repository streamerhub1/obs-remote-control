'use client';
import { useEffect, useState } from 'react';
import { Shield, Tv, Zap, CheckCircle2 } from 'lucide-react';

export default function DashboardOverview() {
  const [user, setUser] = useState<{
    displayName: string;
    avatarUrl: string;
    inviteCode: string;
  } | null>(null);

  useEffect(() => {
    // In a real app we'd fetch from our backend
    // fetch('http://localhost:3000/api/users/me').then(r => r.json()).then(setUser)
    setUser({
      displayName: 'StreamerOne',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      inviteCode: 'A1B2C3D4',
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end pb-6 border-b border-[#222]">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Добро пожаловать, {user?.displayName || 'Стример'}
          </h1>
          <p className="text-gray-400 mt-2">
            Управляйте подключениями и модераторами из единого центра.
          </p>
        </div>
        {user && (
          <img
            src={user.avatarUrl}
            alt="Avatar"
            className="w-16 h-16 rounded-full border-2 border-purple-500"
          />
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl hover:border-purple-500/50 transition-colors group">
          <div className="bg-purple-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Tv className="text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Устройства</h3>
          <p className="text-gray-400 text-sm">
            Подключено 1 устройство (OBS Desktop)
          </p>
        </div>

        <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl hover:border-blue-500/50 transition-colors group">
          <div className="bg-blue-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Shield className="text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Модераторы</h3>
          <p className="text-gray-400 text-sm">У вас 2 активных модератора</p>
        </div>

        <div className="bg-[#111] border border-[#222] p-6 rounded-2xl shadow-xl hover:border-green-500/50 transition-colors group">
          <div className="bg-green-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Zap className="text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">P2P Сеть</h3>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircle2 size={16} className="text-green-500" />
            <span className="text-gray-400 text-sm">
              Система работает стабильно
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-2xl p-8 shadow-xl mt-8">
        <h2 className="text-xl font-semibold mb-4">Ваш код приглашения</h2>
        <p className="text-gray-400 mb-6">
          Отправьте этот код модератору, чтобы он мог отправить вам запрос на
          подключение.
        </p>
        <div className="flex items-center gap-4">
          <div className="bg-[#0A0A0A] border border-[#333] px-6 py-4 rounded-xl font-mono text-2xl tracking-widest text-purple-400 select-all">
            {user?.inviteCode || '--------'}
          </div>
          <button className="bg-white text-black px-6 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
            Сгенерировать новый
          </button>
        </div>
      </div>
    </div>
  );
}
