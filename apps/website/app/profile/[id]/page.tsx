import Link from 'next/link';
import { Button, Avatar, AvatarFallback, AvatarImage, Badge, Card, CardHeader, CardContent } from '@obs-remote/ui';
import { Twitch, Link as LinkIcon, MapPin } from 'lucide-react';

export default function ProfilePage({ params }: { params: { id: string } }) {
  // In a real app, we would fetch the profile data based on params.id
  const profile = {
    displayName: 'VikingGamer',
    twitchLogin: 'viking',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Viking',
    followersCount: 45200,
    followingCount: 120,
    bio: 'Professional Valheim player and speedrunner. Let\'s build something great together!',
    categories: ['Gaming', 'Valheim', 'Speedrun'],
    socialLinks: [
      { platform: 'twitch', url: 'https://twitch.tv/viking' },
      { platform: 'youtube', url: 'https://youtube.com/vikinggamer' }
    ]
  };

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
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">Скачать для Desktop</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <div className="relative">
          <div className="h-64 rounded-xl bg-gradient-to-r from-green-600 to-blue-600 w-full overflow-hidden" />
          
          <div className="absolute -bottom-16 left-8 flex items-end gap-6">
            <Avatar className="w-32 h-32 border-4 border-[#0A0A0A] bg-[#161616]">
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback>{profile.displayName[0]}</AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <Button className="bg-white text-black hover:bg-gray-200 shadow-xl shadow-white/10">Подписаться</Button>
            <Button variant="secondary" className="bg-black/50 hover:bg-black/70 border-none backdrop-blur-md">Предложить коллаб</Button>
          </div>
        </div>

        <div className="pt-20 px-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{profile.displayName}</h1>
              <p className="text-gray-400 text-lg">@{profile.twitchLogin}</p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-2xl font-bold">{(profile.followersCount / 1000).toFixed(1)}K</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Фолловеров</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{profile.followingCount}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Подписок</div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-gray-300 max-w-2xl text-lg leading-relaxed">
            <p>{profile.bio}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {profile.categories.map(cat => (
              <Badge key={cat} variant="secondary" className="text-sm py-1">{cat}</Badge>
            ))}
          </div>

          <div className="mt-8 flex gap-6 text-gray-400">
            {profile.socialLinks.map((link, idx) => (
              <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                {link.platform === 'twitch' ? <Twitch className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                <span>{link.url.replace('https://', '')}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12 px-8">
          <h2 className="text-2xl font-semibold mb-6">Открытые коллаборации</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#161616] border-gray-800 hover:border-gray-700 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-400">Valheim</Badge>
                  <Badge variant="outline" className="text-gray-400 border-gray-700">2/4 мест</Badge>
                </div>
                <CardTitle className="text-lg line-clamp-2 leading-tight">Valheim Boss Rush: Next Weekend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>UTC+1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
