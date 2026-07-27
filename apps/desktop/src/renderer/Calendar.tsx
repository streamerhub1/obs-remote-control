import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@obs-remote/ui';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string;
  sourceType?: string;
}

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInput(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchEvents();
  }, [currentDate]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString();
      const data = await window.desktop.api.calendar.list(start, end);
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error(e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  const fillForm = (dateString: string, event?: CalendarEvent) => {
    const date = new Date(dateString);
    setSelectedDateStr(toDateInput(date));
    setSelectedEvent(event ?? null);
    if (event) {
      const start = new Date(event.startAt);
      const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
      setTitle(event.title);
      setDescription(event.description ?? '');
      setStartTime(toTimeInput(start));
      setEndTime(toTimeInput(end));
    } else {
      setTitle('');
      setDescription('');
      setStartTime('18:00');
      setEndTime('20:00');
    }
    setModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime || !selectedDateStr) return;
    if (selectedEvent?.sourceType === 'collaboration') return;

    setSaving(true);
    try {
      const startDateTime = new Date(`${selectedDateStr}T${startTime}:00`);
      const endDateTime = new Date(`${selectedDateStr}T${endTime}:00`);
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        startAt: startDateTime.toISOString(),
        endAt: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sourceType: 'personalPlan',
      };

      if (selectedEvent) {
        await window.desktop.api.calendar.update(selectedEvent.id, payload);
      } else {
        await window.desktop.api.calendar.create(payload);
      }
      setModalOpen(false);
      await fetchEvents();
    } catch (err: unknown) {
      alert('Ошибка при сохранении события: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || selectedEvent.sourceType === 'collaboration') return;
    setSaving(true);
    try {
      await window.desktop.api.calendar.delete(selectedEvent.id);
      setModalOpen(false);
      await fetchEvents();
    } catch (err: unknown) {
      alert('Ошибка при удалении события: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-gray-100">Календарь</h2>
          <p className="mt-2 text-gray-400">Расписание ваших стримов и коллабораций.</p>
        </div>
        <button
          onClick={() => fillForm(new Date().toDateString())}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus size={18} />
          Добавить
        </button>
      </header>

      <Card className="border-gray-800 bg-[#161616]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl capitalize">{monthName}</CardTitle>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
              <ChevronRight size={20} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                {day}
              </div>
            ))}
            {Array.from({ length: adjustedFirstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] rounded-lg bg-transparent p-2" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = i + 1;
              const dateString = new Date(currentDate.getFullYear(), currentDate.getMonth(), date).toDateString();
              const dayEvents = events.filter((event) => new Date(event.startAt).toDateString() === dateString);

              return (
                <button
                  key={date}
                  onClick={() => fillForm(dateString, dayEvents[0])}
                  className="group flex min-h-[90px] flex-col rounded-lg border border-[var(--border,#1f2937)] bg-[var(--bg-secondary,#111111)] p-2 text-left transition-colors hover:border-[var(--accent,#3b82f6)]"
                >
                  <span className="mb-1 text-sm font-medium text-gray-400 transition-colors group-hover:text-blue-400">{date}</span>
                  <div className="w-full flex-1 space-y-1 overflow-hidden">
                    {loading ? (
                      <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
                    ) : (
                      dayEvents.slice(0, 2).map((event) => (
                        <div key={event.id} className="truncate rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-1 text-xs text-blue-300" title={event.title}>
                          {new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {event.title}
                        </div>
                      ))
                    )}
                    {dayEvents.length > 2 && <div className="px-1 text-[10px] font-medium text-gray-500">+{dayEvents.length - 2} ещё</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-[#161616] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">{selectedEvent ? 'Редактировать событие' : 'Новое событие'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 transition-colors hover:text-white">
                <X size={20} />
              </button>
            </div>

            {selectedEvent?.sourceType === 'collaboration' ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
                  Это событие создано коллаборацией. Изменять его нужно в разделе «Коллаборации».
                </div>
                <div>
                  <div className="text-sm text-gray-500">Название</div>
                  <div className="mt-1 font-medium text-gray-100">{selectedEvent.title}</div>
                </div>
                {selectedEvent.description && <p className="text-sm text-gray-300">{selectedEvent.description}</p>}
                <button type="button" onClick={() => setModalOpen(false)} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Название</label>
                  <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Стрим с подписчиками" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Описание</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="h-20 w-full resize-none rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Планы на стрим..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">Начало</label>
                    <input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-lg border border-[var(--border,#1f2937)] bg-[var(--input-bg,black)] px-3 py-2 text-sm outline-none [color-scheme:dark] focus:border-[var(--accent,#3b82f6)]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">Окончание</label>
                    <input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-lg border border-[var(--border,#1f2937)] bg-[var(--input-bg,black)] px-3 py-2 text-sm outline-none [color-scheme:dark] focus:border-[var(--accent,#3b82f6)]" />
                  </div>
                </div>
                <div className="flex justify-between gap-3 pt-4">
                  {selectedEvent ? (
                    <button type="button" onClick={() => void handleDeleteEvent()} disabled={saving} className="rounded-lg px-3 py-2 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60" title="Удалить событие">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  ) : <span />}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white">
                      Отмена
                    </button>
                    <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-500 disabled:bg-blue-800">
                      {saving ? 'Сохранение...' : selectedEvent ? 'Сохранить' : 'Создать'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
