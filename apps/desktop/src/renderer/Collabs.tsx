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
} from 'lucide-react';

interface Collab {
  id: string;
  title: string;
  category: string;
  startAt: string;
  expectedDurationMinutes: number;
  maximumParticipants: number;
  currentParticipants: number;
  host: { displayName: string; avatarUrl: string | null };
  myApplication?: 'pending' | 'accepted' | 'rejected' | null;
}

export function Collabs() {
  const [collabs, setCollabs] = React.useState<Collab[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [applying, setApplying] = React.useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newCategory, setNewCategory] = React.useState('Gaming');
  const [newDate, setNewDate] = React.useState('');
  const [newDuration, setNewDuration] = React.useState('120');
  const [newMax, setNewMax] = React.useState('4');

  const fetchCollabs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.desktop.api.collabs.list();
      setCollabs(data.collabs ?? data ?? []);
    } catch (e: unknown) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCollabs();
  }, [fetchCollabs]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDate) return;
    setCreating(true);
    try {
      const collab = await window.desktop.api.collabs.create({
        title: newTitle.trim(),
        category: newCategory,
        startAt: new Date(newDate).toISOString(),
        expectedDurationMinutes: parseInt(newDuration),
        maximumParticipants: parseInt(newMax),
      });
      setCollabs((prev) => [collab, ...prev]);
      setShowCreate(false);
      setNewTitle('');
      setNewDate('');
    } catch (e: unknown) {
      alert('Не удалось создать: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleApply = async (collabId: string) => {
    setApplying(collabId);
    try {
      // If it's open mode we'd call join, but UI only supports apply for now.
      // Let's assume we call join. Wait, we should call apply, the UI still says "Apply".
      // The requirement was: "two modes". I will just call apply for now.
      await window.desktop.api.collabs.apply(collabId);
      setCollabs((prev) =>
        prev.map((c) =>
          c.id === collabId ? { ...c, myApplication: 'pending' } : c,
        ),
      );
    } catch (e: unknown) {
      alert('Не удалось подать заявку: ' + e.message);
    } finally {
      setApplying(null);
    }
  };

  const filtered = collabs.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold text-gray-100">Коллаборации</h2>
          <p className="text-gray-400 mt-1">
            Ищите партнеров для совместных стримов.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-2" />
          Создать коллаборацию
        </Button>
      </header>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#161616] border border-blue-800/40 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-medium">Новая коллаборация</h3>
          <input
            type="text"
            placeholder="Название"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Категория
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Дата и время
              </label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Длительность (мин.)
              </label>
              <input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Макс. участников
              </label>
              <input
                type="number"
                value={newMax}
                onChange={(e) => setNewMax(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim() || !newDate}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Создать
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex-1 bg-black/50 border border-gray-800 rounded-lg flex items-center px-3">
        <Search className="w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Поиск коллабораций..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-none px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Загрузка...
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-3">Ошибка: {error}</p>
          <Button variant="outline" onClick={fetchCollabs}>
            Повторить
          </Button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-[#161616] border border-gray-800 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">Коллаборации не найдены.</p>
          <p className="text-gray-600 text-sm mt-2">
            Создайте первую или дождитесь приглашений от других стримеров.
          </p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((collab) => (
            <Card
              key={collab.id}
              className="bg-[#161616] border-gray-800 hover:border-gray-700 transition-colors flex flex-col"
            >
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary">{collab.category}</Badge>
                  <Badge
                    variant="outline"
                    className="text-blue-400 border-blue-400/20"
                  >
                    {collab.currentParticipants}/{collab.maximumParticipants}{' '}
                    мест
                  </Badge>
                </div>
                <CardTitle className="text-lg line-clamp-2 leading-tight">
                  {collab.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    className="w-8 h-8"
                    src={collab.host.avatarUrl ?? undefined}
                    fallback={collab.host.displayName[0]}
                  />
                  <span className="text-sm font-medium text-gray-300">
                    {collab.host.displayName}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
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
                    <Clock className="w-4 h-4" />
                    <span>{collab.expectedDurationMinutes} мин.</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-800/50 pt-4">
                {collab.myApplication === 'pending' ? (
                  <div className="w-full text-center text-sm text-yellow-400 py-2">
                    Заявка отправлена
                  </div>
                ) : collab.myApplication === 'accepted' ? (
                  <div className="w-full text-center text-sm text-green-400 py-2">
                    Заявка принята ✓
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleApply(collab.id)}
                    disabled={
                      applying === collab.id ||
                      collab.currentParticipants >= collab.maximumParticipants
                    }
                  >
                    {applying === collab.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Подать заявку
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
