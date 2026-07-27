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
} from 'lucide-react';

type FeedTab = 'all' | 'following' | 'forYou';

interface FeedAuthor {
  id: string;
  publicId?: number;
  displayName: string;
  twitchLogin: string;
  avatarUrl: string | null;
}

interface Post {
  id: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: FeedAuthor;
}

interface Comment {
  id: string;
  content: string;
  likesCount: number;
  createdAt: string;
  author: FeedAuthor;
}

interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CommentsPanel({
  post,
  onCreated,
}: {
  post: Post;
  onCreated: () => void;
}) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [content, setContent] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const fetchComments = React.useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const response = (await window.desktop.api.feed.comments.list(post.id, {
          cursor: cursor ?? undefined,
          limit: 10,
        })) as Page<Comment>;
        setComments((prev) =>
          cursor ? [...prev, ...response.data] : response.data,
        );
        setNextCursor(response.nextCursor);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [post.id],
  );

  React.useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleCreate = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await window.desktop.api.feed.comments.create(post.id, { content: trimmed });
      setContent('');
      onCreated();
      await fetchComments();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border-t border-gray-800/70 px-4 pb-4 pt-3 sm:px-6">
      <div className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleCreate();
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Написать комментарий"
        />
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={creating || !content.trim()}
          title="Отправить комментарий"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

      <div className="mt-4 space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar
              className="h-8 w-8"
              src={comment.author.avatarUrl ?? undefined}
              fallback={comment.author.displayName[0]}
            />
            <div className="min-w-0 flex-1 rounded-lg bg-black/40 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                <span className="font-medium text-gray-200">
                  {comment.author.displayName}
                </span>
                <span>@{comment.author.twitchLogin}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-300">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка комментариев
        </div>
      )}

      {nextCursor && !loading && (
        <button
          onClick={() => void fetchComments(nextCursor)}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300"
        >
          Показать ещё
        </button>
      )}
    </div>
  );
}

export function Feed() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<FeedTab>('all');
  const [openComments, setOpenComments] = React.useState<Record<string, boolean>>({});
  const [newPostContent, setNewPostContent] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [posting, setPosting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<{ displayName: string; avatarUrl: string | null } | null>(null);

  const fetchPosts = React.useCallback(
    async (cursor?: string | null) => {
      cursor ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const response = (await window.desktop.api.feed.list({
          tab,
          cursor: cursor ?? undefined,
          limit: 20,
        })) as Page<Post>;
        setPosts((prev) => (cursor ? [...prev, ...response.data] : response.data));
        setNextCursor(response.nextCursor);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tab],
  );

  React.useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  React.useEffect(() => {
    window.desktop.api.profile
      .getMe()
      .then((data: { displayName: string; avatarUrl: string | null }) => setProfile(data))
      .catch(() => setProfile(null));
  }, []);

  const handlePost = async () => {
    const trimmed = newPostContent.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      await window.desktop.api.feed.create({ content: trimmed });
      setNewPostContent('');
      await fetchPosts();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const result = (await window.desktop.api.feed.like(postId)) as { liked: boolean };
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, likesCount: Math.max(0, post.likesCount + (result.liked ? 1 : -1)) }
            : post,
        ),
      );
    } catch {
      // Like state will be corrected on next refresh.
    }
  };

  const tabs: Array<{ id: FeedTab; label: string }> = [
    { id: 'all', label: 'Все' },
    { id: 'following', label: 'Подписки' },
    { id: 'forYou', label: 'Для вас' },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-gray-100 sm:text-3xl">Лента</h2>
          <p className="mt-1 text-sm text-gray-400 sm:text-base">
            Публичные посты сообщества в обратном хронологическом порядке.
          </p>
        </div>
        <button
          onClick={() => void fetchPosts()}
          className="self-start rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white sm:self-auto"
          title="Обновить"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </header>

      <div className="inline-flex rounded-lg border border-gray-800 bg-black/50 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={
              item.id === tab
                ? 'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white'
                : 'rounded-md px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card className="border-gray-800 bg-[#161616]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex gap-3 sm:gap-4">
            <Avatar
              src={profile?.avatarUrl ?? undefined}
              fallback={profile?.displayName?.[0] ?? 'Я'}
            />
            <div className="min-w-0 flex-1 space-y-3">
              <textarea
                className="min-h-[88px] w-full resize-none rounded-lg border border-gray-800 bg-black/50 p-3 text-sm outline-none focus:border-blue-500"
                placeholder="Что нового, стример?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={handlePost} disabled={posting || !newPostContent.trim()}>
                  {posting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Опубликовать
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-14 text-gray-500">
          <Loader2 className="mr-3 h-6 w-6 animate-spin" /> Загрузка ленты
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-6 text-center">
          <p className="mb-3 text-red-400">Не удалось загрузить ленту: {error}</p>
          <Button variant="outline" onClick={() => void fetchPosts()}>Повторить</Button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#161616] p-10 text-center">
          <p className="text-lg text-gray-500">В ленте пока нет публикаций.</p>
          <p className="mt-2 text-sm text-gray-600">Опубликуйте первый пост или вернитесь позже.</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden border-gray-800 bg-[#161616]">
              <CardHeader className="flex flex-row items-center gap-3 p-4 pb-2 sm:p-6 sm:pb-2">
                <Avatar src={post.author.avatarUrl ?? undefined} fallback={post.author.displayName[0]} />
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{post.author.displayName}</CardTitle>
                  <p className="truncate text-xs text-gray-400">
                    @{post.author.twitchLogin} · {formatDate(post.createdAt)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-3 sm:px-6">
                <p className="whitespace-pre-wrap break-words text-gray-300">{post.content}</p>
              </CardContent>
              <CardFooter className="flex gap-5 border-t border-gray-800/50 px-4 py-3 text-gray-400 sm:px-6">
                <button
                  onClick={() => void handleLike(post.id)}
                  className="flex items-center gap-2 transition-colors hover:text-pink-500"
                >
                  <Heart className="h-5 w-5" />
                  <span className="text-sm">{post.likesCount}</span>
                </button>
                <button
                  onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                  className="flex items-center gap-2 transition-colors hover:text-blue-500"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm">{post.commentsCount}</span>
                </button>
              </CardFooter>
              {openComments[post.id] && (
                <CommentsPanel
                  post={post}
                  onCreated={() =>
                    setPosts((prev) =>
                      prev.map((item) =>
                        item.id === post.id
                          ? { ...item, commentsCount: item.commentsCount + 1 }
                          : item,
                      ),
                    )
                  }
                />
              )}
            </Card>
          ))}
        </div>
      )}

      {nextCursor && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void fetchPosts(nextCursor)} disabled={loadingMore}>
            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Загрузить ещё
          </Button>
        </div>
      )}
    </div>
  );
}
