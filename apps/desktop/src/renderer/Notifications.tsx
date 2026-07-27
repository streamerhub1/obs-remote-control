import React from 'react';
import { Card, CardContent, Avatar, Button } from '@obs-remote/ui';
import {
  UserPlus,
  Heart,
  MessageCircle,
  Calendar as CalendarIcon,
  Check,
  Loader2,
  Bell,
  Shield,
  MonitorPlay,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  actor: { displayName: string; avatarUrl: string | null } | null;
  readAt: string | null;
  createdAt: string;
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function actorName(n: Notification) {
  return n.actor?.displayName ?? 'StreamerHub';
}

export function Notifications() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.desktop.api.notifications.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await window.desktop.api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      // Read state will refresh later.
    }
  };

  const markRead = async (id: string) => {
    try {
      await window.desktop.api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch {
      // Read state will refresh later.
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="h-5 w-5 text-blue-400" />;
      case 'like':
        return <Heart className="h-5 w-5 text-pink-400" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-green-400" />;
      case 'collab_invite':
      case 'collab_application':
      case 'collab_accepted':
        return <CalendarIcon className="h-5 w-5 text-purple-400" />;
      case 'moderator_invite':
      case 'moderator_accepted':
      case 'moderator_rejected':
        return <Shield className="h-5 w-5 text-cyan-400" />;
      case 'session_request':
        return <MonitorPlay className="h-5 w-5 text-orange-400" />;
      default:
        return <Check className="h-5 w-5 text-gray-400" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case 'follow':
        return <span><strong className="text-white">{actorName(n)}</strong> подписался на вас</span>;
      case 'like':
        return <span><strong className="text-white">{actorName(n)}</strong> оценил ваш пост</span>;
      case 'comment':
        return <span><strong className="text-white">{actorName(n)}</strong> прокомментировал ваш пост</span>;
      case 'collab_invite':
        return <span><strong className="text-white">{actorName(n)}</strong> пригласил вас в коллаборацию</span>;
      case 'collab_application':
        return <span><strong className="text-white">{actorName(n)}</strong> подал заявку на вашу коллаборацию</span>;
      case 'collab_accepted':
        return <span>Ваша заявка на коллаборацию принята.</span>;
      case 'moderator_invite':
        return <span><strong className="text-white">{actorName(n)}</strong> пригласил вас стать модератором</span>;
      case 'moderator_accepted':
        return <span><strong className="text-white">{actorName(n)}</strong> принял приглашение модератора</span>;
      case 'moderator_rejected':
        return <span><strong className="text-white">{actorName(n)}</strong> отклонил приглашение модератора</span>;
      case 'session_request':
        return <span><strong className="text-white">{actorName(n)}</strong> запросил удалённую сессию OBS</span>;
      default:
        return <span>Новое уведомление от {actorName(n)}</span>;
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-2xl font-semibold text-gray-100 sm:text-3xl">
          Уведомления
          {unreadCount > 0 && <span className="ml-3 rounded-full bg-blue-600 px-2.5 py-0.5 text-base font-normal text-white">{unreadCount}</span>}
        </h2>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="self-start border-gray-800 text-gray-400 sm:self-auto" onClick={markAllRead}>
            Отметить все как прочитанные
          </Button>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-3 h-6 w-6 animate-spin" /> Загрузка уведомлений
        </div>
      )}
      {error && !loading && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-6 text-center">
          <p className="mb-3 text-red-400">Ошибка: {error}</p>
          <Button variant="outline" onClick={() => void fetchNotifications()}>Повторить</Button>
        </div>
      )}
      {!loading && !error && notifications.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#161616] p-10 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-lg text-gray-500">Уведомлений нет.</p>
          <p className="mt-2 text-sm text-gray-600">Здесь появятся лайки, комментарии, коллаборации и запросы модераторов.</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                'cursor-pointer border-gray-800 transition-colors',
                !n.readAt ? 'border-l-2 border-l-blue-500 bg-[#1A1A1A]' : 'bg-[#161616]',
              )}
              onClick={() => !n.readAt && void markRead(n.id)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="shrink-0 rounded-full bg-black/30 p-2">{getIcon(n.type)}</div>
                <Avatar className="h-10 w-10 shrink-0" src={n.actor?.avatarUrl ?? undefined} fallback={n.actor?.displayName?.[0] ?? 'S'} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-300">{getMessage(n)}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(n.createdAt).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.readAt && <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
