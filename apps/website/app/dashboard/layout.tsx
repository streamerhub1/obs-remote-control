import { Home, Shield, Tv, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white">
      <aside className="w-64 bg-[#111] border-r border-[#222] p-6 flex flex-col">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-8">
          StreamerHub
        </h1>
        
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#222] transition-colors">
            <Home size={20} />
            Обзор
          </Link>
          <Link href="/dashboard/devices" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#222] transition-colors">
            <Tv size={20} />
            Устройства
          </Link>
          <Link href="/dashboard/moderators" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#222] transition-colors">
            <Shield size={20} />
            Модераторы
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#222] transition-colors">
            <Settings size={20} />
            Настройки
          </Link>
        </nav>
        
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-auto">
          <LogOut size={20} />
          Выйти
        </button>
      </aside>
      <main className="flex-1 overflow-auto bg-[#0A0A0A] p-8">
        {children}
      </main>
    </div>
  );
}
