import React from 'react';
import { Tv } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authenticated, setAuthenticated] = React.useState(false);

  React.useEffect(() => {
    if (!window.desktop?.auth) return;
    window.desktop.auth.getState().then((state: unknown) => {
      setAuthenticated(state.authenticated);
      setAuthLoading(false);
    });
    return window.desktop.auth.subscribe((state: unknown) => {
      if (state.loading !== undefined) setAuthLoading(state.loading);
      if (state.authenticated !== undefined)
        setAuthenticated(state.authenticated);
    });
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
