import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Avatar } from '@obs-remote/ui';
import { Heart, MessageCircle, Share2, Send, Loader2, RefreshCw } from 'lucide-react';

interface Post {
  id: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: { id: string; displayName: string; twitchLogin: string; avatarUrl: string | null };
}



export function Feed() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.desktop.api.feed.list();
      setPosts(data.posts ?? data ?? []);
    } catch (e: unknown) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      const post = await window.desktop.api.feed.create({ content: newPostContent.trim() });
      setPosts(prev => [post, ...prev]);
      setNewPostContent('');
    } catch (e: unknown) {
      alert('Не удалось опубликовать: ' + e.message);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await window.desktop.api.feed.like(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p));
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-gray-100">Лента активности</h2>
          <p className="text-gray-400 mt-1">Следите за обновлениями стримеров и находите коллаборации.</p>
        </div>
        <button onClick={fetchPosts} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors" title="Обновить">
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* New post */}
      <Card className="bg-[#161616] border-gray-800">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Avatar fallback="ME" />
            <div className="flex-1 space-y-3">
              <textarea
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 outline-none resize-none min-h-[90px]"
                placeholder="Что нового, стример?"
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={handlePost} disabled={posting || !newPostContent.trim()}>
                  {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Опубликовать
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Загрузка ленты...
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-3">Не удалось загрузить ленту: {error}</p>
          <Button variant="outline" onClick={fetchPosts}>Повторить</Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className="bg-[#161616] border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-lg">Лента пуста.</p>
          <p className="text-gray-600 text-sm mt-2">Подписывайтесь на стримеров — их публикации появятся здесь.</p>
        </div>
      )}

      {/* Posts */}
      {!loading && (
        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id} className="bg-[#161616] border-gray-800">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar src={post.author.avatarUrl ?? undefined} fallback={post.author.displayName[0]} />
                <div>
                  <CardTitle className="text-base">{post.author.displayName}</CardTitle>
                  <p className="text-xs text-gray-400">
                    @{post.author.twitchLogin} • {new Date(post.createdAt).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 whitespace-pre-wrap">{post.content}</p>
              </CardContent>
              <CardFooter className="pt-0 border-t border-gray-800/50 mt-4 pt-4 flex gap-6 text-gray-400">
                <button onClick={() => handleLike(post.id)} className="flex items-center gap-2 hover:text-pink-500 transition-colors">
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
      )}
    </div>
  );
}
