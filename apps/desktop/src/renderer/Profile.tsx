import React from 'react';
import { Card, CardHeader, CardContent, Button, Avatar, AvatarFallback, AvatarImage, Badge } from '@obs-remote/ui';
import { Edit2, Link as LinkIcon, MapPin, Twitch } from 'lucide-react';

export function Profile() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header>
        <h2 className="text-3xl font-semibold text-gray-100">Мой профиль</h2>
      </header>

      <div className="relative">
        <div className="h-48 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 w-full overflow-hidden">
          {/* Banner Image could go here */}
        </div>
        
        <div className="absolute -bottom-16 left-8 flex items-end gap-6">
          <Avatar className="w-32 h-32 border-4 border-[#0A0A0A] bg-[#161616]">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Me" />
            <AvatarFallback>ME</AvatarFallback>
          </Avatar>
        </div>
        <div className="absolute top-4 right-4">
          <Button variant="secondary" className="bg-black/50 hover:bg-black/70 border-none backdrop-blur-md">
            <Edit2 className="w-4 h-4 mr-2" />
            Редактировать
          </Button>
        </div>
      </div>

      <div className="pt-20 px-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Мой Никнейм</h1>
            <p className="text-gray-400">@my_twitch_login</p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <div className="text-xl font-bold">12.5K</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Фолловеров</div>
            </div>
            <div>
              <div className="text-xl font-bold">142</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Подписок</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-gray-300 max-w-2xl">
          <p>Привет! Я стример, играю в различные игры и общаюсь с чатом. Всегда открыт для новых коллабораций и интересных проектов.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="secondary">Gaming</Badge>
          <Badge variant="secondary">Just Chatting</Badge>
          <Badge variant="secondary">Russian</Badge>
          <Badge variant="secondary">English</Badge>
        </div>

        <div className="mt-6 flex gap-4 text-gray-400">
          <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
            <Twitch className="w-5 h-5" />
            <span>twitch.tv/my_twitch_login</span>
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
            <LinkIcon className="w-5 h-5" />
            <span>youtube.com/mychannel</span>
          </a>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#161616] border-gray-800">
          <CardHeader>
            <h3 className="text-lg font-medium">Предпочтения для коллабораций</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-400">
            <div>
              <strong className="block text-gray-300">Доступность</strong>
              <span>Открыт для предложений (Пт, Сб, Вс)</span>
            </div>
            <div>
              <strong className="block text-gray-300">Часовой пояс</strong>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" />
                <span>UTC+3 (MSK)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
