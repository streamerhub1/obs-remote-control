import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Avatar } from '@obs-remote/ui';
import { Activity, Tv, Calendar as CalendarIcon, Users, Bell, MonitorPlay, Rss, Globe } from 'lucide-react';

export function Home({ obsState, navigate }: { obsState: string, navigate: (route: string) => void }) {
  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-gray-100">Добро пожаловать, Streamer!</h2>
        <p className="text-gray-400 mt-1">Вот что происходит в вашем сообществе и студии.</p>
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
                  <Activity className={obsState === 'connected' ? 'text-green-400 w-5 h-5' : 'text-red-400 w-5 h-5'} />
                  <div>
                    <div className="font-medium text-sm">Локальный OBS</div>
                    <div className="text-xs text-gray-500">{obsState === 'connected' ? 'Подключен' : 'Отключен'}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('my_obs')}>Управление</Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3">
                  <Globe className="text-blue-400 w-5 h-5" />
                  <div>
                    <div className="font-medium text-sm">Удаленные сессии</div>
                    <div className="text-xs text-gray-500">Нет активных (Демо)</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('remote_obs')}>Список</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161616] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-400" />
                Уведомления <Badge variant="danger" className="ml-2">3</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm p-3 bg-gray-800/30 rounded-lg border border-gray-800/50">
                <span className="font-semibold text-blue-400">VikingGamer</span> предложил коллаборацию (Демо)
              </div>
              <div className="text-sm p-3 bg-gray-800/30 rounded-lg border border-gray-800/50">
                <span className="font-semibold text-green-400">AnnaLive</span> принял заявку на модерацию (Демо)
              </div>
              <Button variant="outline" className="w-full text-xs" onClick={() => navigate('notifications')}>Все уведомления</Button>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column: Collabs & Calendar */}
        <div className="space-y-6">
          <Card className="bg-[#161616] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                Ближайшие события
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-l-2 border-purple-500 pl-3">
                <div className="text-xs text-purple-400 font-semibold mb-1">Сегодня, 18:00 (Демо)</div>
                <div className="font-medium text-sm">Minecraft Speedrun Collab</div>
                <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                  <Avatar className="w-4 h-4" fallback="V" />
                  <span>С VikingGamer</span>
                </div>
              </div>
              <div className="border-l-2 border-blue-500 pl-3">
                <div className="text-xs text-blue-400 font-semibold mb-1">Завтра, 20:00 (Демо)</div>
                <div className="font-medium text-sm">Just Chatting / Q&A</div>
                <div className="text-xs text-gray-500 mt-1">Личный стрим</div>
              </div>
              <Button variant="outline" className="w-full text-xs" onClick={() => navigate('calendar')}>Открыть календарь</Button>
            </CardContent>
          </Card>

          <Card className="bg-[#161616] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                Рекомендованные коллаборации
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-black/50 rounded-lg border border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="success" className="text-[10px] py-0">Valheim</Badge>
                  <span className="text-xs text-gray-500">1/4 мест</span>
                </div>
                <div className="font-medium text-sm mb-2">Valheim Boss Rush (Демо)</div>
                <Button size="sm" className="w-full bg-gray-800 hover:bg-gray-700 text-xs">Подробнее</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Feed */}
        <div className="space-y-6">
          <Card className="bg-[#161616] border-gray-800 h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Rss className="w-5 h-5 text-pink-400" />
                Новое в ленте
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6" fallback="A" />
                  <span className="font-medium text-sm">AlexPro (Демо)</span>
                  <span className="text-xs text-gray-500">2 ч назад</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-3">
                  Ребята, завтра запускаю марафон на 24 часа! Кто хочет залететь на совместные катки в CS2 - пишите в ЛС или кидайте заявки на коллаб. Будет жарко! 🔥
                </p>
              </div>
              <hr className="border-gray-800" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6" fallback="M" />
                  <span className="font-medium text-sm">MariaStream (Демо)</span>
                  <span className="text-xs text-gray-500">5 ч назад</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">
                  Ищу модератора на вечерние стримы.
                </p>
              </div>
              <div className="pt-4">
                <Button variant="outline" className="w-full text-xs" onClick={() => navigate('feed')}>Перейти в ленту</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
