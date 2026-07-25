import React from 'react';
import { Tv } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!window.desktop?.auth) return;
    window.desktop.auth
      .getState()
      .then(
        (state: {
          authenticated: boolean;
          loading?: boolean;
          error?: string;
        }) => {
          setAuthenticated(state.authenticated);
          if (state.error) setError(state.error);
          else setError(null);
          setAuthLoading(false);
        },
      );
    return window.desktop.auth.subscribe(((state: {
      authenticated: boolean;
      loading?: boolean;
      error?: string;
    }) => {
      if (state.loading !== undefined) setAuthLoading(state.loading);
      if (state.authenticated !== undefined)
        setAuthenticated(state.authenticated);
      if (state.error !== undefined) setError(state.error);
    }) as (state: unknown) => void);
  }, []);

  const handleTwitchLogin = () => window.desktop?.auth?.login();

  if (authLoading) {
    return (
      <div className="flex flex-col h-screen w-screen bg-[#0A0A0A] text-white items-center justify-center drag-region">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse mb-4">
          StreamerHub
        </h1>
        <div className="text-gray-500 text-sm">Загрузка...</div>
      </div>
    );
  }

  const handleRetry = () => {
    setAuthLoading(true);
    setError(null);
    window.desktop?.auth
      .getState()
      .then((state: { authenticated: boolean; error?: string }) => {
        setAuthenticated(state.authenticated);
        if (state.error) setError(state.error);
        else setError(null);
        setAuthLoading(false);
      });
  };

  const handleLogout = () => {
    setAuthLoading(true);
    window.desktop?.auth.logout().then(() => {
      window.desktop?.auth.login();
    });
  };

  if (error === 'offline') {
    return (
      <div className="flex h-screen w-screen bg-[#0A0A0A] text-white items-center justify-center drag-region">
        <div className="bg-[#161616] border border-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center no-drag">
          <h1 className="text-2xl font-bold text-red-400 mb-2">
            Ошибка подключения
          </h1>
          <p className="text-gray-400 text-sm mb-8">
            Не удалось связаться с сервером
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg"
            >
              Повторить
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all"
            >
              Войти заново
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-screen w-screen bg-[#0A0A0A] text-white items-center justify-center drag-region">
        <div className="bg-[#161616] border border-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center no-drag">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
            StreamerHub
          </h1>
          <p className="text-gray-400 text-sm mb-8">
            Единый центр управления стримами, коллаборациями и сообществом.
          </p>
          <button
            onClick={handleTwitchLogin}
            className="w-full py-3 px-4 bg-[#9146FF] hover:bg-[#772CE8] text-white rounded-xl font-semibold transition-all shadow-lg shadow-[#9146FF]/20 flex items-center justify-center gap-2"
          >
            <Tv size={20} />
            Войти через Twitch
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
