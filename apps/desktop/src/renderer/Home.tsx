import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Avatar } from '@obs-remote/ui';
import {
  Activity,
  Calendar as CalendarIcon,
  Users,
  Bell,
  MonitorPlay,
  Rss,
  Globe,
  Shield,
  Loader2,
} from 'lucide-react';

type RouteName =
  | 'home'
  | 'feed'
  | 'collabs'
  | 'calendar'
  | 'my_obs'
  | 'remote_obs'
  | 'moderators'
  | 'notifications'
  | 'profile'
  | 'settings';

interface HomeProfile {
  displayName: string;
  twitchLogin: string;
  avatarUrl: string | null;
  publicId?: number;
}

interface HomeEvent {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
  sourceType?: string;
}

interface HomePost {
  id: string;
  content: string;
  commentsCount: number;
  createdAt: string;
  author: {
    displayName: string;
    twitchLogin: string;
    avatarUrl: string | null;
  };
}

interface HomeCollab {
  id: string;
  title: string;
  category?: string | null;
  startAt: string;
  currentParticipants: number;
  maximumParticipants: number;
}

interface HomeNotification {
  id: string;
  readAt: string | null;
  type: string;
}

interface HomeRelationshipResponse {
  asStreamer?: Array<{ id: string; status: string }>;
  asModerator?: Array<{ id: string; status: string }>;
}

interface HomeRemoteSession {
  id: string;
  status: string;
  createdAt: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusText(status: string) {
  if (status === 'connected') return 'Подключён';
  if (status === 'connecting') return 'Подключение';
  return 'Отключён';
}

export function Home({
  obsState,
  navigate,
}: {
  obsState: string;
  navigate: (route: RouteName) => void;
}) {
  const [profile, setProfile] = React.useState<HomeProfile | null>(null);
  const [events, setEvents] = React.useState<HomeEvent[]>([]);
  const [posts, setPosts] = React.useState<HomePost[]>([]);
  const [collabs, setCollabs] = React.useState<HomeCollab[]>([]);
  const [notifications, setNotifications] = React.useState<HomeNotification[]>([]);
  const [relationships, setRelationships] = React.useState<HomeRelationshipResponse>({});
  const [remoteSessions, setRemoteSessions] = React.useState<HomeRemoteSession[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    async function load() {
      setLoading(true);
      const results = await Promise.allSettled([
        window.desktop.api.profile.getMe(),
        window.desktop.api.calendar.list(start.toISOString(), end.toISOString()),
        window.desktop.api.feed.list({ tab: 'all', limit: 3 }),
        window.desktop.api.collabs.list(),
        window.desktop.api.notifications.list(),
        window.desktop.api.relationships.list(),
        window.desktop.api.remoteSessions.list(),
      ]);

      if (cancelled) return;
      const [profileResult, eventsResult, postsResult, collabsResult, notificationsResult, relationshipsResult, sessionsResult] = results;

      if (profileResult.status === 'fulfilled') setProfile(profileResult.value as HomeProfile);
      if (eventsResult.status === 'fulfilled') {
        const rawEvents = eventsResult.value as HomeEvent[] | { data?: HomeEvent[] } | null;
        const calendarEvents = Array.isArray(rawEvents) ? rawEvents : (rawEvents?.data ?? []);
        setEvents(
          calendarEvents
            .sort((a, b) => {
              const aTime = new Date(a.startAt).getTime();
              const bTime = new Date(b.startAt).getTime();
              const aFuture = aTime >= now.getTime();
              const bFuture = bTime >= now.getTime();
              if (aFuture !== bFuture) return aFuture ? -1 : 1;
              return aFuture ? aTime - bTime : bTime - aTime;
            })
            .slice(0, 3),
        );
      }
      if (postsResult.status === 'fulfilled') setPosts(((postsResult.value as { data: HomePost[] }).data ?? []).slice(0, 3));
      if (collabsResult.status === 'fulfilled') {
        const rawCollabs = collabsResult.value as HomeCollab[] | { data?: HomeCollab[] } | null;
        const collabData = Array.isArray(rawCollabs) ? rawCollabs : (rawCollabs?.data ?? []);
        setCollabs(collabData.slice(0, 2));
      }
      if (notificationsResult.status === 'fulfilled') setNotifications((notificationsResult.value as HomeNotification[]) ?? []);
      if (relationshipsResult.status === 'fulfilled') setRelationships((relationshipsResult.value as HomeRelationshipResponse) ?? {});
      if (sessionsResult.status === 'fulfilled') setRemoteSessions(((sessionsResult.value as HomeRemoteSession[]) ?? []).slice(0, 3));
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const activeRemoteSessions = remoteSessions.filter((session) =>
    ['creating', 'signaling', 'connected'].includes(session.status),
  ).length;
  const moderatorInvites = relationships.asModerator?.filter((rel) => rel.status === 'pending').length ?? 0;
  const activeModerators = relationships.asStreamer?.filter((rel) => rel.status === 'active').length ?? 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold text-gray-100 sm:text-3xl">
            {profile ? `Здравствуйте, ${profile.displayName}` : 'Главная'}
          </h2>
          <p className="mt-1 text-sm text-gray-400 sm:text-base">
            Реальные данные профиля, студии и сообщества.
          </p>
        </div>
        <button
          onClick={() => navigate('profile')}
          className="flex items-center gap-3 self-start rounded-lg border border-gray-800 bg-[#161616] px-3 py-2 text-left sm:self-auto"
        >
          <Avatar src={profile?.avatarUrl ?? undefined} fallback={profile?.displayName?.[0] ?? 'S'} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-gray-100">
              {profile?.displayName ?? 'Профиль'}
            </span>
            <span className="block truncate text-xs text-gray-500">
              {profile ? `@${profile.twitchLogin}${profile.publicId ? ` · id: ${profile.publicId}` : ''}` : 'Открыть профиль'}
            </span>
          </span>
        </button>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Обновление данных
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5">
          <Card className="border-gray-800 bg-[#161616]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MonitorPlay className="h-5 w-5 text-blue-400" /> Студия
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-black/50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Activity className={obsState === 'connected' ? 'h-5 w-5 text-green-400' : 'h-5 w-5 text-red-400'} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">Локальный OBS</div>
                    <div className="text-xs text-gray-500">{statusText(obsState)}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('my_obs')}>OBS</Button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-black/50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Globe className="h-5 w-5 text-cyan-400" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">Удалённые сессии</div>
                    <div className="text-xs text-gray-500">Активных: {activeRemoteSessions}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('remote_obs')}>Открыть</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-[#161616]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-emerald-400" /> Модераторы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-300">
              <div className="flex justify-between"><span>Активные модераторы</span><span>{activeModerators}</span></div>
              <div className="flex justify-between"><span>Входящие приглашения</span><span>{moderatorInvites}</span></div>
              <Button variant="outline" className="w-full text-xs" onClick={() => navigate('moderators')}>Настроить доступ</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-gray-800 bg-[#161616]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="h-5 w-5 text-indigo-400" /> Ближайшие события
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {events.length === 0 ? (
                <p className="text-sm text-gray-500">Ближайших событий нет.</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="border-l-2 border-blue-500 pl-3">
                    <div className="mb-1 text-xs font-semibold text-blue-400">{formatDate(event.startAt)}</div>
                    <div className="text-sm font-medium">{event.title}</div>
                    <div className="mt-1 text-xs text-gray-500">{event.sourceType ?? 'calendar'}</div>
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full text-xs" onClick={() => navigate('calendar')}>Календарь</Button>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-[#161616]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-green-400" /> Коллаборации
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {collabs.length === 0 ? (
                <p className="text-sm text-gray-500">Открытых коллабораций нет.</p>
              ) : (
                collabs.map((collab) => (
                  <div key={collab.id} className="rounded-lg border border-gray-800 bg-black/50 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <Badge variant="secondary" className="text-[10px]">{collab.category ?? 'Без категории'}</Badge>
                      <span className="text-xs text-gray-500">{collab.currentParticipants}/{collab.maximumParticipants}</span>
                    </div>
                    <div className="line-clamp-2 text-sm font-medium">{collab.title}</div>
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full text-xs" onClick={() => navigate('collabs')}>Все коллаборации</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-gray-800 bg-[#161616]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-yellow-400" /> Уведомления
                {unreadCount > 0 && <Badge variant="danger">{unreadCount}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.slice(0, 3).length === 0 ? (
                <p className="text-sm text-gray-500">Новых уведомлений нет.</p>
              ) : (
                notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="rounded-lg border border-gray-800 bg-black/40 p-3 text-sm text-gray-300">
                    {notification.type}
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full text-xs" onClick={() => navigate('notifications')}>Все уведомления</Button>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-[#161616]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Rss className="h-5 w-5 text-pink-400" /> Новое в ленте
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {posts.length === 0 ? (
                <p className="text-sm text-gray-500">Публикаций пока нет.</p>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="space-y-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="h-6 w-6" src={post.author.avatarUrl ?? undefined} fallback={post.author.displayName[0]} />
                      <span className="truncate text-sm font-medium">{post.author.displayName}</span>
                      <span className="shrink-0 text-xs text-gray-500">{formatDate(post.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 break-words text-sm text-gray-300">{post.content}</p>
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full text-xs" onClick={() => navigate('feed')}>Перейти в ленту</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
