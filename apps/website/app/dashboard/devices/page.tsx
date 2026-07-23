'use client';
import { Tv, MonitorSmartphone, XCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DevicesPage() {
  const [devices, setDevices] = useState([
    { id: '1', name: 'OBS Studio - Игровой ПК', platform: 'win32', lastActive: 'Только что' },
    { id: '2', name: 'OBS Studio - Ноутбук', platform: 'darwin', lastActive: '2 часа назад' }
  ]);

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Устройства</h1>
        <p className="text-gray-400 mt-2">Список авторизованных OBS-клиентов, привязанных к вашему аккаунту.</p>
      </header>

      <div className="space-y-4">
        {devices.map(device => (
          <div key={device.id} className="bg-[#111] border border-[#222] p-6 rounded-2xl flex items-center justify-between group hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-5">
              <div className="bg-[#1a1a1a] p-3 rounded-xl text-gray-400">
                {device.platform === 'win32' ? <MonitorSmartphone size={24} /> : <Tv size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-200">{device.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Clock size={14} />
                  Последняя активность: {device.lastActive}
                </div>
              </div>
            </div>
            
            <button className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 bg-red-400/0 hover:bg-red-400/10 rounded-lg flex items-center gap-2">
              <XCircle size={20} />
              <span className="text-sm font-medium">Отозвать доступ</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
