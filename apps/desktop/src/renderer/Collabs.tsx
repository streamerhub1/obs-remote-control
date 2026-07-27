import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Avatar,
} from '@obs-remote/ui';
import {
  Calendar as CalendarIcon,
  Clock,
  Search,
  Loader2,
  Plus,
  Users,
  ExternalLink,
  Copy,
} from 'lucide-react';

interface Collab {
  id: string;
  title: string;
  category: string | null;
  startAt: string;
  expectedDurationMinutes: number;
  maximumParticipants: number;
  currentParticipants: number;
  applicationMode: 'approval' | 'open' | string;
  visibility: string;
  inviteUrl?: string;
  host: { id?: string; displayName: string; avatarUrl: string | null } | null;
  myApplication?: { status: string } | null;
}

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function buildCollabInviteUrl(collab: Pick<Collab, 'id' | 'title' | 'category' | 'startAt' | 'expectedDurationMinutes' | 'maximumParticipants' | 'applicationMode'>) {
  const url = new URL('https://streamhubb.vercel.app/');
  url.searchParams.set('invite', 'collab');
  url.searchParams.set('collabId', collab.id);
  url.searchParams.set('title', collab.title);
  if (collab.category) url.searchParams.set('category', collab.category);
  url.searchParams.set('startAt', collab.startAt);
  url.searchParams.set('duration', String(collab.expectedDurationMinutes));
  url.searchParams.set('max', String(collab.maximumParticipants));
  url.searchParams.set('mode', collab.applicationMode);
  return url.toString();
}

export function Collabs() {
  const [collabs, setCollabs] = React.useState<Collab[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [applying, setApplying] = React.useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = React.useState<string | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newCategory, setNewCategory] = React.useState('Gaming');
  const [newDate, setNewDate] = React.useState(() => toDateInput(new Date()));
  const [newTime, setNewTime] = React.useState('20:00');
  const [newDuration, setNewDuration] = React.useState('120');
  const [newMax, setNewMax] = React.useState('4');
  const [newMode, setNewMode] = React.useState('approval');

  const fetchCollabs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.desktop.api.collabs.list();
      const data = Array.isArray(response) ? response : response?.data;
      setCollabs(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCollabs();
  }, [fetchCollabs]);

  const resetForm = () => {
    setNewTitle('');
    setNewCategory('Gaming');
    setNewDate(toDateInput(new Date()));
    setNewTime('20:00');
    setNewDuration('120');
    setNewMax('4');
    setNewMode('approval');
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDate || !newTime) return;
    const startAt = new Date(`${newDate}T${newTime}:00`);
    const duration = Number.parseInt(newDuration, 10);
    const maximumParticipants = Number.parseInt(newMax, 10);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(duration) || Number.isNaN(maximumParticipants)) {
      alert('Проверьте дату, время, длительность и число участников.');
      return;
    }

    setCreating(true);
    try {
      const created = (await window.desktop.api.collabs.create({
        title: newTitle.trim(),
        category: newCategory.trim() || null,
        startAt: startAt.toISOString(),
        expectedDurationMinutes: duration,
        maximumParticipants,
        applicationMode: newMode,
      })) as Collab;
      const inviteUrl = created.inviteUrl ?? buildCollabInviteUrl({
        id: created.id,
        title: created.title ?? newTitle.trim(),
        category: created.category ?? (newCategory.trim() || null),
        startAt: created.startAt ?? startAt.toISOString(),
        expectedDurationMinutes: created.expectedDurationMinutes ?? duration,
        maximumParticipants: created.maximumParticipants ?? maximumParticipants,
        applicationMode: created.applicationMode ?? newMode,
      });
      setLastInviteUrl(inviteUrl);
      setShowCreate(false);
      resetForm();
      await fetchCollabs();
      await window.desktop.openExternalUrl(inviteUrl).catch(() => false);
    } catch (e: unknown) {
      alert('Не удалось создать: ' + (e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleApply = async (collabId: string, mode: string) => {
    setApplying(collabId);
    try {
      if (mode === 'open') {
        await window.desktop.api.collabs.join(collabId);
      } else {
        await window.desktop.api.collabs.apply(collabId);
      }
      fetchCollabs();
    } catch (e: unknown) {
      alert('Не удалось подать заявку: ' + (e as Error).message);
    } finally {
      setApplying(null);
    }
  };

  const copyLastInvite = async () => {
    if (!lastInviteUrl) return;
    await navigator.clipboard?.writeText(lastInviteUrl).catch(() => undefined);
  };

  const filtered = collabs.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.category ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100 sm:text-3xl">Коллаборации</h2>
          <p className="mt-1 text-sm text-gray-400 sm:text-base">
            Ищите партнеров для совместных стримов.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать коллаборацию
        </Button>
      </header>

      {lastInviteUrl && (
        <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4">
          <div className="mb-2 text-sm font-medium text-blue-100">Ссылка приглашения</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={lastInviteUrl} className="min-w-0 flex-1 rounded-lg border border-gray-800 bg-black px-3 py-2 text-xs text-gray-300" />
            <Button variant="outline" onClick={() => void copyLastInvite()}>
              <Copy className="mr-2 h-4 w-4" />
              Копировать
            </Button>
            <Button onClick={() => void window.desktop.openExternalUrl(lastInviteUrl)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Открыть
            </Button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="rounded-xl border border-blue-800/40 bg-[#161616] p-5">
          <h3 className="mb-4 text-lg font-medium">Новая коллаборация</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Название"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Категория</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Дата</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Время</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Длительность (мин.)</label>
                <input
                  type="number"
                  min="1"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Макс. участников</label>
                <input
                  type="number"
                  min="2"
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Режим участия</label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-[var(--input-bg,black)] px-3 py-2 text-sm text-[var(--text-primary,white)] outline-none focus:border-blue-500"
                >
                  <option value="approval">По заявкам</option>
                  <option value="open">Свободный вход</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newDate || !newTime}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Создать
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center rounded-lg border border-gray-800 bg-black/50 px-3">
        <Search className="h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Поиск коллабораций..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border-none bg-transparent px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-3 h-6 w-6 animate-spin" /> Загрузка...
        </div>
      )}
      {error && !loading && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-6 text-center">
          <p className="mb-3 text-red-400">Ошибка: {error}</p>
          <Button variant="outline" onClick={fetchCollabs}>Повторить</Button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#161616] p-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-lg text-gray-500">Коллаборации не найдены.</p>
          <p className="mt-2 text-sm text-gray-600">
            Создайте первую или дождитесь приглашений от других стримеров.
          </p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((collab) => (
            <Card key={collab.id} className="flex flex-col border-gray-800 bg-[#161616] transition-colors hover:border-gray-700">
              <CardHeader>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Badge variant="secondary">{collab.category ?? 'Без категории'}</Badge>
                  <Badge variant="outline" className="border-blue-400/20 text-blue-400">
                    {collab.currentParticipants}/{collab.maximumParticipants} мест
                  </Badge>
                </div>
                <CardTitle className="line-clamp-2 text-lg leading-tight">{collab.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8" src={collab.host?.avatarUrl ?? undefined} fallback={collab.host?.displayName?.[0] ?? '?'} />
                  <span className="truncate text-sm font-medium text-gray-300">{collab.host?.displayName || 'Неизвестный хост'}</span>
                </div>
                <div className="space-y-1 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Режим: {collab.applicationMode === 'open' ? 'Свободный вход' : 'По заявкам'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {new Date(collab.startAt).toLocaleDateString('ru', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{collab.expectedDurationMinutes} мин.</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-800/50 pt-4">
                {collab.myApplication?.status === 'pending' ? (
                  <div className="w-full py-2 text-center text-sm text-yellow-400">Заявка отправлена</div>
                ) : collab.myApplication?.status === 'accepted' ? (
                  <div className="w-full py-2 text-center text-sm text-green-400">Вы участник</div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleApply(collab.id, collab.applicationMode)}
                    disabled={applying === collab.id || collab.currentParticipants >= collab.maximumParticipants}
                  >
                    {applying === collab.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {collab.applicationMode === 'open' ? 'Присоединиться' : 'Подать заявку'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
