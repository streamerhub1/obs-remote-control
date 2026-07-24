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
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  actor: { displayName: string; avatarUrl: string | null };
  readAt: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
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
      setNotifications(data.notifications ?? data ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await window.desktop.api.notifications.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString(),
        })),
      );
    } catch {
      /* silent */
    }
  };

  const markRead = async (id: string) => {
    try {
      await window.desktop.api.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
    } catch {
      /* silent */
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'like':
        return <Heart className="w-5 h-5 text-pink-400" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-green-400" />;
      case 'collab_invite':
      case 'collab_application':
      case 'collab_accepted':
        return <CalendarIcon className="w-5 h-5 text-purple-400" />;
      default:
        return <Check className="w-5 h-5 text-gray-400" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case 'follow':
        return (
          <span>
            <strong className="text-white">{n.actor.displayName}</strong>{' '}
            подписался на вас
          </span>
        );
      case 'like':
        return (
          <span>
            <strong className="text-white">{n.actor.displayName}</strong> оценил
            ваш пост
          </span>
        );
      case 'comment':
        return (
          <span>
            <strong className="text-white">{n.actor.displayName}</strong>{' '}
            прокомментировал ваш пост
          </span>
        );
      case 'collab_invite':
        return (
          <span>
            <strong className="text-white">{n.actor.displayName}</strong>{' '}
            пригласил вас в коллаборацию
          </span>
        );
      case 'collab_application':
        return (
          <span>
            <strong className="text-white">{n.actor.displayName}</strong> подал
            заявку на вашу коллаборацию
          </span>
        );
      case 'collab_accepted':
        return <span>Ваша заявка на коллаборацию принята!</span>;
      default:
        return <span>Новое уведомление от {n.actor.displayName}</span>;
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold text-gray-100">
            Уведомления
            {unreadCount > 0 && (
              <span className="ml-3 text-base font-normal bg-blue-600 text-white rounded-full px-2.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-gray-400 border-gray-800"
            onClick={markAllRead}
          >
            Отметить все как прочитанные
          </Button>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Загрузка
          уведомлений...
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-3">Ошибка: {error}</p>
          <Button variant="outline" onClick={fetchNotifications}>
            Повторить
          </Button>
        </div>
      )}
      {!loading && !error && notifications.length === 0 && (
        <div className="bg-[#161616] border border-gray-800 rounded-xl p-12 text-center">
          <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">Уведомлений нет.</p>
          <p className="text-gray-600 text-sm mt-2">
            Здесь будут появляться лайки, подписки и приглашения.
          </p>
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                'border-gray-800 transition-colors cursor-pointer',
                !n.readAt
                  ? 'bg-[#1A1A1A] border-l-2 border-l-blue-500'
                  : 'bg-[#161616]',
              )}
              onClick={() => !n.readAt && markRead(n.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-black/30 rounded-full flex-shrink-0">
                  {getIcon(n.type)}
                </div>
                <Avatar
                  className="w-10 h-10 flex-shrink-0"
                  src={n.actor.avatarUrl ?? undefined}
                  fallback={n.actor.displayName[0]}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm">{getMessage(n)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(n.createdAt).toLocaleString('ru', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.readAt && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
