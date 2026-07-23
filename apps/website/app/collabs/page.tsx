import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent, CardFooter, Badge, Avatar } from '@obs-remote/ui';
import { Calendar, Clock, Search, Filter } from 'lucide-react';

export default function CollabsDirectory() {
  const collabs = [
    {
      id: '1',
      title: 'Among Us with viewers and streamers',
      category: 'Gaming',
      startAt: new Date(Date.now() + 86400000).toISOString(),
      expectedDurationMinutes: 180,
      maximumParticipants: 10,
      currentParticipants: 4,
      host: {
        displayName: 'ImpostorKing',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Impostor'
      }
    },
    {
      id: '2',
      title: 'Music Production Stream - Feedback Session',
      category: 'Music',
      startAt: new Date(Date.now() + 172800000).toISOString(),
      expectedDurationMinutes: 120,
      maximumParticipants: 5,
      currentParticipants: 2,
      host: {
        displayName: 'BeatMaker',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beat'
      }
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <nav className="border-b border-gray-800 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
              SH
            </div>
            <span className="font-semibold text-lg tracking-tight">StreamerHub</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button size="sm" variant="outline" className="border-gray-700">Войти</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">Создать профиль</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Биржа коллабораций</h1>
          <p className="text-gray-400 text-lg">Находите интересные стримы для совместного участия и расширяйте аудиторию.</p>
        </header>

        <div className="flex gap-4">
          <div className="flex-1 bg-[#161616] border border-gray-800 rounded-lg flex items-center px-4">
            <Search className="w-5 h-5 text-gray-500" />
            <input type="text" placeholder="Поиск по играм, темам или стримерам..." className="w-full bg-transparent border-none px-4 py-3 focus:outline-none" />
          </div>
          <Button variant="outline" className="gap-2 border-gray-700 bg-[#161616]">
            <Filter className="w-4 h-4" />
            Фильтры
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collabs.map(collab => (
            <Card key={collab.id} className="bg-[#161616] border-gray-800 hover:border-gray-700 transition-colors flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">{collab.category}</Badge>
                  <Badge variant="outline" className="text-gray-400 border-gray-700">{collab.currentParticipants}/{collab.maximumParticipants} мест</Badge>
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
                <Button className="w-full bg-white text-black hover:bg-gray-200">Подробнее</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
