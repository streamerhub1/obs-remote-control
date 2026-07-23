import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@obs-remote/ui';

export function Calendar() {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold text-gray-100">Календарь</h2>
        <p className="text-gray-400 mt-2">Расписание ваших стримов и коллабораций.</p>
      </header>

      <Card className="bg-[#161616] border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl">Ноябрь 2026</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {days.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            
            {/* Empty slots for offset */}
            <div className="p-2 min-h-[100px] rounded-lg border border-gray-800/50 bg-black/20" />
            <div className="p-2 min-h-[100px] rounded-lg border border-gray-800/50 bg-black/20" />
            <div className="p-2 min-h-[100px] rounded-lg border border-gray-800/50 bg-black/20" />
            
            {dates.map(date => (
              <div key={date} className="p-2 min-h-[100px] rounded-lg border border-gray-800 bg-[#1A1A1A] hover:border-gray-700 transition-colors">
                <span className="text-sm font-medium text-gray-400">{date}</span>
                {date === 15 && (
                  <div className="mt-2 p-1.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300">
                    <div className="font-medium truncate">Podcast Collab</div>
                    <div className="text-[10px] opacity-80">18:00</div>
                  </div>
                )}
                {date === 18 && (
                  <div className="mt-2 p-1.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300">
                    <div className="font-medium truncate">Subathon</div>
                    <div className="text-[10px] opacity-80">10:00</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
