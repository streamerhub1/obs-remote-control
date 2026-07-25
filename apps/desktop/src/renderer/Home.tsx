import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Avatar,
} from '@obs-remote/ui';
import {
  Activity,
  CalendarIcon,
  Users,
  Bell,
  MonitorPlay,
  Globe,
  Rss,
  Loader2,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Collab {
  id: string;
  title: string;
  category: string | null;
  maximumParticipants: number;
  currentParticipants: number;
}

interface FeedPost {
  id: string;
  content: string;
  createdAt: string;
  author: { displayName: string; avatarUrl: string | null };
}

function formatEventTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString('ru', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) return `Сегодня, ${time}`;
  if (isTomorrow) return `Завтра, ${time}`;
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + `, ${time}`;
}

export function Home({
  obsState,
  navigate,
}: {
  obsState: string;
  navigate: (route: string) => void;
}) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [collabs, setCollabs] = React.useState<Collab[]>([]);
  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [loadingNotifs, setLoadingNotifs] = React.useState(true);
  const [loadingEvents, setLoadingEvents] = React.useState(true);
  const [loadingCollabs, setLoadingCollabs] = React.useState(true);
  const [loadingPosts, setLoadingPosts] = React.useState(true);

  React.useEffect(() => {
    // Notifications
    window.desktop.api.notifications
      .list()
      .then(
        (
          res: unknown,
        ) => {
          const arr = (res as { data?: Notification[] })?.data ?? (res as Notification[]) ?? [];
          setNotifications((arr as Notification[]).filter((n) => !n.read).slice(0, 3));
        },
      )
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifs(false));

    // Upcoming events (next 7 days)
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    window.desktop.api.calendar
      .list(now.toISOString(), weekLater.toISOString())
      .then((res: unknown) => {
        const arr =
          (res as { data?: CalendarEvent[] })?.data ??
          (res as CalendarEvent[]) ??
          [];
        setEvents((arr as CalendarEvent[]).slice(0, 3));
      })
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));

    // Collaborations
    window.desktop.api.collabs
      .list()
      .then((res: { data?: Collab[] }) => {
        setCollabs((res.data ?? []).slice(0, 2));
      })
      .catch(() => setCollabs([]))
      .finally(() => setLoadingCollabs(false));

    // Feed preview (community)
    window.desktop.api.feed
      .community()
      .then((res: { data?: FeedPost[] }) => {
        setPosts((res.data ?? []).slice(0, 2));
      })
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false));
  }, []);

  const unreadCount = notifications.length;

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-gray-100">
          Добро пожаловать!
        </h2>
        <p className="text-gray-400 mt-1">
          Вот что происходит в вашем сообществе и студии.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Studio & Notifications */}
        <div className="space-y-6">
          <Card className="bg-[#161616] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-purple-400" />
                Студия
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3">
                  <Activity
                    className={
                      obsState === 'connected'
                        ? 'text-green-400 w-5 h-5'
                        : 'text-red-400 w-5 h-5'
                    }
                  />
                  <div>
                    <div className="font-medium text-sm">Локальный OBS</div>
                    <div className="text-xs text-gray-500">
                      {obsState === 'connected' ? 'Подключен' : 'Отключен'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('my_obs')}
                >
                  Управление
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3">
                  <Globe className="text-blue-400 w-5 h-5" />
                  <div>
                    <div className="font-medium text-sm">Удалённые сессии</div>
                    <div className="text-xs text-gray-500">
                      Нет активных
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('remote_obs')}
                >
                  Список
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161616] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-400" />
                Уведомления{' '}
                {unreadCount > 0 && (
                  <Badge variant="danger" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingNotifs ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">Нет новых уведомлений</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="text-sm p-3 bg-gray-800/30 rounded-lg border border-gray-800/50"
                  >
                    <span className="text-gray-300">{n.message}</span>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => navigate('notifications')}
              >
                Все уведомления
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column: Events & Collabs */}
        <div className="space-y-6">
          <Card className="bg-[#161616] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                Ближайшие события
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingEvents ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
                </div>
              ) : events.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">Ближайших событий нет</p>
              ) : (
                events.map((ev, i) => (
                  <div
                    key={ev.id}
                    className={`border-l-2 pl-3 ${
                      i % 2 === 0 ? 'border-purple-500' : 'border-blue-500'
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        i % 2 === 0 ? 'text-purple-400' : 'text-blue-400'
                      }`}
                    >
                      {formatEventTime(ev.startAt)}
                    </div>
                    <div className="font-medium text-sm">{ev.title}</div>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => navigate('calendar')}
              >
                Открыть календарь
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#161616] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                Открытые коллаборации
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingCollabs ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
                </div>
              ) : collabs.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">Нет открытых коллабораций</p>
              ) : (
                collabs.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-black/50 rounded-lg border border-gray-800"
                  >
                    <div className="flex justify-between items-start mb-2">
                      {c.category && (
                        <Badge variant="success" className="text-[10px] py-0">
                          {c.category}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {c.currentParticipants}/{c.maximumParticipants} мест
                      </span>
                    </div>
                    <div className="font-medium text-sm mb-2">{c.title}</div>
                    <Button
                      size="sm"
                      className="w-full bg-gray-800 hover:bg-gray-700 text-xs"
                      onClick={() => navigate('collabs')}
                    >
                      Подробнее
                    </Button>
                  </div>
                ))
              )}
              {!loadingCollabs && (
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => navigate('collabs')}
                >
                  Все коллаборации
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Feed preview */}
        <div className="space-y-6">
          <Card className="bg-[#161616] border-gray-800 h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Rss className="w-5 h-5 text-pink-400" />
                Новое в ленте
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {loadingPosts ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
                </div>
              ) : posts.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">Лента пуста</p>
              ) : (
                posts.map((post, i) => (
                  <div key={post.id}>
                    {i > 0 && <hr className="border-gray-800 my-2" />}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="w-6 h-6"
                          src={post.author.avatarUrl ?? undefined}
                          fallback={post.author.displayName[0]}
                        />
                        <span className="font-medium text-sm">
                          {post.author.displayName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleString('ru', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-3">
                        {post.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => navigate('feed')}
                >
                  Перейти в ленту
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

