import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@obs-remote/ui';

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // New event form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch for current month (simplified range for demo)
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
      const data = await window.desktop.api.calendar.list(start, end);
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error(e);
      // Fallback empty array on error
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startAt || !endAt) return;
    
    try {
      await window.desktop.api.calendar.create({
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sourceType: 'personalPlan',
      });
      setModalOpen(false);
      setTitle('');
      setDescription('');
      setStartAt('');
      setEndAt('');
      fetchEvents();
    } catch (e: unknown) {
      alert('Ошибка при создании события: ' + e.message);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  // Adjust JS getDay() where Sunday is 0 to Monday is 0
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold text-gray-100">Календарь</h2>
          <p className="text-gray-400 mt-2">Расписание ваших стримов и коллабораций.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
        >
          <Plus size={18} />
          Добавить
        </button>
      </header>

      <Card className="bg-[#161616] border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl capitalize">{monthName}</CardTitle>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {days.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2 uppercase tracking-wider">
                {day}
              </div>
            ))}
            
            {/* Empty slots for offset */}
            {Array.from({ length: adjustedFirstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 min-h-[90px] rounded-lg bg-transparent" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = i + 1;
              const dateString = new Date(currentDate.getFullYear(), currentDate.getMonth(), date).toDateString();
              
              // Filter events for this day
              const dayEvents = events.filter(e => new Date(e.startAt).toDateString() === dateString);
              
              return (
                <div key={date} className="p-2 min-h-[90px] rounded-lg border border-gray-800 bg-[#1A1A1A] hover:border-gray-700 transition-colors flex flex-col">
                  <span className="text-sm font-medium text-gray-400 mb-1">{date}</span>
                  <div className="flex-1 overflow-hidden space-y-1">
                    {loading ? (
                       <div className="h-4 bg-gray-800 animate-pulse rounded w-full"></div>
                    ) : dayEvents.slice(0, 3).map(event => (
                      <div key={event.id} className="px-1.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300 truncate" title={event.title}>
                        {new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500 font-medium px-1">+{dayEvents.length - 3} ещё</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161616] border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Новое событие</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Название</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="Стрим с подписчиками" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Описание (опционально)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none h-20 resize-none" placeholder="Планы на стрим..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Начало</label>
                  <input required type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Окончание</label>
                  <input required type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none [color-scheme:dark]" />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">Отмена</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
