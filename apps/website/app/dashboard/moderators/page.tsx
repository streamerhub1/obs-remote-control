'use client';
import { ShieldAlert, Trash2, Check, X, Shield } from 'lucide-react';

export default function ModeratorsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Модераторы
        </h1>
        <p className="text-gray-400 mt-2">
          Управляйте правами доступа к вашему OBS.
        </p>
      </header>

      {/* Pending Requests */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
          <ShieldAlert className="text-yellow-500" />
          Входящие запросы
        </h2>
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-[#222] bg-[#141414]">
            <div className="flex items-center gap-4">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mod1"
                alt="avatar"
                className="w-12 h-12 rounded-full"
              />
              <div>
                <h3 className="font-medium text-white">Nightbot_Human</h3>
                <p className="text-sm text-gray-500">
                  Запрос отправлен 10 минут назад
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-colors font-medium">
                <Check size={18} /> Принять
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-medium">
                <X size={18} /> Отклонить
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Active Moderators */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
          <Shield className="text-blue-500" />
          Активные модераторы
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mod2"
                alt="avatar"
                className="w-12 h-12 rounded-full border border-[#333]"
              />
              <div>
                <h3 className="font-medium text-white">AwesomeMod</h3>
                <p className="text-xs text-green-500 font-medium">
                  Полный доступ
                </p>
              </div>
            </div>
            <button className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
