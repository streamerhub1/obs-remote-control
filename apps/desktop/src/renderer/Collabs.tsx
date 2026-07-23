import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Badge, Button, Avatar } from '@obs-remote/ui';
import { Calendar, Users, Clock, Search, Filter } from 'lucide-react';

export function Collabs() {
  const [collabs, setCollabs] = React.useState<any[]>([]);

  React.useEffect(() => {
    setCollabs([
      {
        id: '1',
        title: 'Valheim Boss Rush',
        category: 'Gaming',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        expectedDurationMinutes: 180,
        maximumParticipants: 4,
        currentParticipants: 2,
        host: {
          displayName: 'VikingGamer',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Viking'
        }
      },
      {
        id: '2',
        title: 'Podcast: Future of Streaming',
        category: 'Just Chatting',
        startAt: new Date(Date.now() + 172800000).toISOString(),
        expectedDurationMinutes: 120,
        maximumParticipants: 3,
        currentParticipants: 1,
        host: {
          displayName: 'TechTalk',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech'
        }
      }
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold text-gray-100">Коллаборации</h2>
          <p className="text-gray-400 mt-2">Ищите партнеров для совместных стримов.</p>
        </div>
        <Button>Создать коллаборацию</Button>
      </header>

      <div className="flex gap-4">
        <div className="flex-1 bg-black/50 border border-gray-800 rounded-lg flex items-center px-3">
          <Search className="w-5 h-5 text-gray-500" />
          <input type="text" placeholder="Поиск коллабораций..." className="w-full bg-transparent border-none px-3 py-2 text-sm focus:outline-none" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Фильтры
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collabs.map(collab => (
          <Card key={collab.id} className="bg-[#161616] border-gray-800 hover:border-gray-700 transition-colors flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary">{collab.category}</Badge>
                <Badge variant="outline" className="text-blue-400 border-blue-400/20">{collab.currentParticipants}/{collab.maximumParticipants} мест</Badge>
              </div>
              <CardTitle className="text-lg line-clamp-2 leading-tight">{collab.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8" src={collab.host.avatarUrl} fallback={collab.host.displayName[0]} />
                <span className="text-sm font-medium text-gray-300">{collab.host.displayName}</span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(collab.startAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{collab.expectedDurationMinutes} мин.</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-gray-800/50 pt-4">
              <Button className="w-full">Подать заявку</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
