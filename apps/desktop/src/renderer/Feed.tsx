import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Avatar,
} from '@obs-remote/ui';
import {
  Heart,
  MessageCircle,
  Send,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    twitchLogin: string;
    avatarUrl: string | null;
  };
}

interface Post {
  id: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    twitchLogin: string;
    avatarUrl: string | null;
  };
}

type FeedTab = 'all' | 'subscriptions' | 'foryou';

function CommentsSection({ postId }: { postId: string }) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newComment, setNewComment] = React.useState('');
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    window.desktop.api.feed.comments
      .list(postId)
      .then((res: { data: Comment[] }) => setComments(res.data ?? []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const comment = await window.desktop.api.feed.comments.create(
        postId,
        newComment.trim(),
      );
      setComments((prev) => [comment as Comment, ...prev]);
      setNewComment('');
    } catch {
      /* silent */
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-800/50 pt-4 space-y-3">
      <div className="flex gap-2">
        <textarea
          className="flex-1 bg-black/50 border border-gray-800 rounded-lg p-2 text-sm focus:border-blue-500 outline-none resize-none min-h-[60px]"
          placeholder="Написать комментарий..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={posting || !newComment.trim()}
          className="self-end"
        >
          {posting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-gray-500 text-sm">Пока нет комментариев</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 p-2 bg-black/30 rounded-lg">
              <Avatar
                className="w-6 h-6 flex-shrink-0"
                src={c.author.avatarUrl ?? undefined}
                fallback={c.author.displayName[0]}
              />
              <div>
                <span className="text-xs font-medium text-gray-300">
                  {c.author.displayName}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Feed() {
  const [activeTab, setActiveTab] = React.useState<FeedTab>('all');
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = React.useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = React.useState('');
  const [openComments, setOpenComments] = React.useState<Set<string>>(
    new Set(),
  );

  React.useEffect(() => {
    window.desktop.api.profile
      .getMe()
      .then((p: { avatarUrl: string | null; displayName: string } | null) => {
        if (p) {
          setMyAvatarUrl(p.avatarUrl);
          setMyDisplayName(p.displayName);
        }
      })
      .catch(() => {});
  }, []);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response: { data: Post[] };
      if (activeTab === 'subscriptions') {
        response = await window.desktop.api.feed.list();
      } else {
        // 'all' and 'foryou' both use community feed
        response = await window.desktop.api.feed.community();
      }
      setPosts(response.data ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPosts();
  }, [fetchPosts]);

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      await window.desktop.api.feed.create({
        content: newPostContent.trim(),
      });
      setNewPostContent('');
      await fetchPosts();
    } catch (e: unknown) {
      alert('Не удалось опубликовать: ' + (e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const result = await window.desktop.api.feed.like(postId);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likesCount: Math.max(
                  0,
                  post.likesCount + (result.liked ? 1 : -1),
                ),
              }
            : post,
        ),
      );
    } catch {
      /* silent */
    }
  };

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const tabs: { id: FeedTab; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'subscriptions', label: 'Подписки' },
    { id: 'foryou', label: 'Для вас' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-gray-100">
            Лента активности
          </h2>
          <p className="text-gray-400 mt-1">
            Следите за обновлениями стримеров и находите коллаборации.
          </p>
        </div>
        <button
          onClick={fetchPosts}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="Обновить"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/30 rounded-lg p-1 border border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* New post */}
      <Card className="bg-[#161616] border-gray-800">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Avatar
              src={myAvatarUrl ?? undefined}
              fallback={myDisplayName ? myDisplayName[0] : 'ME'}
            />
            <div className="flex-1 space-y-3">
              <textarea
                className="w-full bg-black/50 border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 outline-none resize-none min-h-[90px]"
                placeholder="Что нового, стример?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handlePost}
                  disabled={posting || !newPostContent.trim()}
                >
                  {posting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
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
          <p className="text-red-400 mb-3">
            Не удалось загрузить ленту: {error}
          </p>
          <Button variant="outline" onClick={fetchPosts}>
            Повторить
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className="bg-[#161616] border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-lg">Лента пуста.</p>
          <p className="text-gray-600 text-sm mt-2">
            {activeTab === 'subscriptions'
              ? 'Подписывайтесь на стримеров — их публикации появятся здесь.'
              : 'Будьте первым, кто опубликует запись!'}
          </p>
        </div>
      )}

      {/* Posts */}
      {!loading && (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="bg-[#161616] border-gray-800">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar
                  src={post.author.avatarUrl ?? undefined}
                  fallback={post.author.displayName[0]}
                />
                <div>
                  <CardTitle className="text-base">
                    {post.author.displayName}
                  </CardTitle>
                  <p className="text-xs text-gray-400">
                    @{post.author.twitchLogin} •{' '}
                    {new Date(post.createdAt).toLocaleString('ru', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {post.content}
                </p>
                {openComments.has(post.id) && (
                  <CommentsSection postId={post.id} />
                )}
              </CardContent>
              <CardFooter className="pt-0 border-t border-gray-800/50 mt-4 pt-4 flex gap-6 text-gray-400">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-2 hover:text-pink-500 transition-colors"
                >
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{post.likesCount}</span>
                </button>
                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-2 hover:text-blue-500 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.commentsCount}</span>
                  {openComments.has(post.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


