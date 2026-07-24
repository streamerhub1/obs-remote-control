import React from 'react';
import { Card, CardHeader, CardContent, Button, Avatar, Badge } from '@obs-remote/ui';
import { Edit2, Link as LinkIcon, MapPin, Video, Loader2, Save, X } from 'lucide-react';

interface UserProfile {
  id: string;
  displayName: string;
  twitchLogin: string;
  avatarUrl: string | null;
  bio: string | null;
  languages: string[];
  categories: string[];
  timezone: string | null;
  twitchUrl: string | null;
}



export function Profile() {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Edit form state
  const [bio, setBio] = React.useState('');
  const [languages, setLanguages] = React.useState('');
  const [categories, setCategories] = React.useState('');
  const [timezone, setTimezone] = React.useState('');

  const fetchProfile = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.desktop.api.profile.getMe();
      setProfile(data);
      setBio(data.bio ?? '');
      setLanguages((data.languages ?? []).join(', '));
      setCategories((data.categories ?? []).join(', '));
      setTimezone(data.timezone ?? '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await window.desktop.api.profile.updateMe({
        bio: bio.trim() || null,
        languages: languages.split(',').map(s => s.trim()).filter(Boolean),
        categories: categories.split(',').map(s => s.trim()).filter(Boolean),
        timezone: timezone.trim() || null,
      });
      setProfile(updated);
      setEditing(false);
    } catch (e: any) {
      alert('Не удалось сохранить: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-3" /> Загрузка профиля...
    </div>
  );

  if (error) return (
    <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-8 text-center">
      <p className="text-red-400 mb-4">Ошибка загрузки профиля: {error}</p>
      <p className="text-gray-500 text-sm mb-4">Убедитесь, что вы вошли через Twitch и backend запущен.</p>
      <Button variant="outline" onClick={fetchProfile}>Повторить</Button>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header><h2 className="text-3xl font-semibold text-gray-100">Мой профиль</h2></header>

      {/* Banner + Avatar */}
      <div className="relative">
        <div className="h-48 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 w-full overflow-hidden" />
        <div className="absolute -bottom-16 left-8">
          <Avatar className="w-32 h-32 border-4 border-[#0A0A0A] bg-[#161616]"
            src={profile.avatarUrl ?? undefined} fallback={profile.displayName[0]} />
        </div>
        <div className="absolute top-4 right-4">
          {!editing ? (
            <Button variant="secondary" className="bg-black/50 hover:bg-black/70 border-none backdrop-blur-md"
              onClick={() => setEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />Редактировать
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" className="bg-black/50 border-none backdrop-blur-md" onClick={() => setEditing(false)}>
                <X className="w-4 h-4 mr-2" />Отмена
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Сохранить
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="pt-20 px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-gray-400">@{profile.twitchLogin}</p>
        </div>

        {/* Bio */}
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
              <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none"
                placeholder="Расскажи о себе..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Языки (через запятую)</label>
                <input type="text" value={languages} onChange={e => setLanguages(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="Russian, English" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Категории (через запятую)</label>
                <input type="text" value={categories} onChange={e => setCategories(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="Gaming, Just Chatting" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Часовой пояс</label>
              <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="UTC+3" />
            </div>
          </div>
        ) : (
          <>
            {profile.bio && <p className="text-gray-300 max-w-2xl">{profile.bio}</p>}
            {!profile.bio && (
              <p className="text-gray-600 italic text-sm">
                Bio не заполнено. Нажмите «Редактировать», чтобы добавить описание.
              </p>
            )}
            {(profile.languages?.length > 0 || profile.categories?.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {profile.categories?.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
                {profile.languages?.map(l => <Badge key={l} variant="outline">{l}</Badge>)}
              </div>
            )}
            {profile.twitchUrl && (
              <div className="flex gap-4 text-gray-400">
                <a href={profile.twitchUrl} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Video className="w-5 h-5" /><span>twitch.tv/{profile.twitchLogin}</span>
                </a>
              </div>
            )}
            {profile.timezone && (
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" /><span>{profile.timezone}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
