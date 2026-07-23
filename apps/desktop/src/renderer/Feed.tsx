import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@obs-remote/ui';
import { Button } from '@obs-remote/ui';
import { Avatar } from '@obs-remote/ui';
import { Heart, MessageCircle, Share2, Send } from 'lucide-react';

export function Feed() {
  const [posts, setPosts] = React.useState<any[]>([]);
  const [newPostContent, setNewPostContent] = React.useState('');

  React.useEffect(() => {
    // In a real app, we would fetch from /api/v1/feed
    // For now, mockup data
    setPosts([
      {
        id: '1',
        content: 'Just finished an amazing 12-hour subathon! Thanks everyone for the support! 🎮💜',
        likesCount: 124,
        commentsCount: 15,
        createdAt: new Date().toISOString(),
        author: {
          id: 'user1',
          displayName: 'ProGamer_99',
          twitchLogin: 'progamer_99',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ProGamer_99'
        }
      },
      {
        id: '2',
        content: 'Looking for someone to collab on a Minecraft hardcore series this weekend. Any takers?',
        likesCount: 45,
        commentsCount: 8,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        author: {
          id: 'user2',
          displayName: 'CraftyBuilder',
          twitchLogin: 'crafty',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Crafty'
        }
      }
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold text-gray-100">Лента активности</h2>
        <p className="text-gray-400 mt-2">Следите за обновлениями стримеров и находите новые коллаборации.</p>
      </header>

      <Card className="bg-[#161616] border-gray-800">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Avatar fallback="ME" />
            <div className="flex-1 space-y-3">
              <textarea 
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none min-h-[100px]"
                placeholder="Что нового, стример?"
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
              />
              <div className="flex justify-end">
                <Button>
                  <Send className="w-4 h-4 mr-2" />
                  Опубликовать
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {posts.map(post => (
          <Card key={post.id} className="bg-[#161616] border-gray-800">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <Avatar src={post.author.avatarUrl} fallback={post.author.displayName[0]} />
              <div>
                <CardTitle className="text-base">{post.author.displayName}</CardTitle>
                <p className="text-xs text-gray-400">@{post.author.twitchLogin} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">{post.content}</p>
            </CardContent>
            <CardFooter className="pt-0 border-t border-gray-800/50 mt-4 pt-4 flex gap-6 text-gray-400">
              <button className="flex items-center gap-2 hover:text-pink-500 transition-colors">
                <Heart className="w-5 h-5" />
                <span className="text-sm">{post.likesCount}</span>
              </button>
              <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{post.commentsCount}</span>
              </button>
              <button className="flex items-center gap-2 hover:text-green-500 transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
              </button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
