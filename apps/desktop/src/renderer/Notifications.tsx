import React from 'react';
import { Card, CardContent, Avatar, AvatarFallback, AvatarImage, Button } from '@obs-remote/ui';
import { UserPlus, Heart, MessageCircle, Calendar as CalendarIcon, Check } from 'lucide-react';
import { cn } from '@obs-remote/ui/src/utils';

export function Notifications() {
  const [notifications, setNotifications] = React.useState<any[]>([]);

  React.useEffect(() => {
    setNotifications([
      {
        id: '1',
        type: 'follow',
        actor: { displayName: 'GamingFan123', avatarUrl: '' },
        readAt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        type: 'like',
        actor: { displayName: 'VikingGamer', avatarUrl: '' },
        readAt: null,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        type: 'collab_invite',
        actor: { displayName: 'TechTalk', avatarUrl: '' },
        readAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'like': return <Heart className="w-5 h-5 text-pink-400" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-green-400" />;
      case 'collab_invite': return <CalendarIcon className="w-5 h-5 text-purple-400" />;
      default: return <Check className="w-5 h-5 text-gray-400" />;
    }
  };

  const getMessage = (n: any) => {
    switch (n.type) {
      case 'follow': return <span><strong className="text-white">{n.actor.displayName}</strong> подписался на вас</span>;
      case 'like': return <span><strong className="text-white">{n.actor.displayName}</strong> оценил ваш пост</span>;
      case 'comment': return <span><strong className="text-white">{n.actor.displayName}</strong> прокомментировал ваш пост</span>;
      case 'collab_invite': return <span><strong className="text-white">{n.actor.displayName}</strong> пригласил вас в коллаборацию</span>;
      default: return <span>Новое уведомление от {n.actor.displayName}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold text-gray-100">Уведомления</h2>
        </div>
        <Button variant="outline" size="sm" className="text-gray-400 border-gray-800">Отметить все как прочитанные</Button>
      </header>

      <div className="space-y-3">
        {notifications.map(n => (
          <Card key={n.id} className={cn("border-gray-800 transition-colors", !n.readAt ? "bg-[#1A1A1A] border-l-2 border-l-blue-500" : "bg-[#161616]")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-black/30 rounded-full">
                {getIcon(n.type)}
              </div>
              <Avatar className="w-10 h-10">
                <AvatarImage src={n.actor.avatarUrl} />
                <AvatarFallback>{n.actor.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-gray-300 text-sm">{getMessage(n)}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.readAt && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
