import React from 'react';
import {
  Home as HomeIcon,
  Shield,
  Activity,
  Tv,
  MonitorPlay,
  Globe,
  Rss,
  Users,
  Calendar as CalendarIcon,
  Bell,
  User,
  Settings as SettingsIcon,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ObsDashboard } from './ObsDashboard';
import { LocalObsDataSource, RemoteObsDataSource } from './data-sources';
import { WebSocketRelayTransport } from './transports/WebSocketRelayTransport';
import { Moderators } from './Moderators';
import { Feed } from './Feed';
import { Collabs } from './Collabs';
import { Calendar } from './Calendar';
import { Profile } from './Profile';
import { Notifications } from './Notifications';
import { Settings } from './Settings';
import { Home as HomeView } from './Home';
import { AuthGate } from './AuthGate';
import { RouteErrorBoundary } from './ErrorBoundary';
import { useTheme } from './useTheme';

type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'not-available' }
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string };

function UpdateBanner() {
  const [updaterState, setUpdaterState] = React.useState<UpdaterState>({
    status: 'idle',
  });
  const [showError, setShowError] = React.useState(false);
  const [showDownloaded, setShowDownloaded] = React.useState(true); // to control 'Later' dismissal

  React.useEffect(() => {
    if (!window.desktop?.updater) return;

    window.desktop.updater.getState().then((state: unknown) => {
      setUpdaterState(state as UpdaterState);
    });

    const cleanup = window.desktop.updater.onStateChanged(
      (status: string, data?: unknown) => {
        const payload = data as Record<string, unknown> | undefined;
        setUpdaterState((prev) => {
          let newState = { ...prev, status } as UpdaterState;
          if (status === 'available' || status === 'downloaded') {
            newState = {
              status: status as 'available' | 'downloaded',
              version: payload?.version as string,
            };
          } else if (status === 'downloading') {
            newState = {
              status: 'downloading',
              version: payload?.version as string,
              percent: payload?.percent as number,
            };
          } else if (status === 'error') {
            newState = { status: 'error', message: payload?.message as string };
            setShowError(true);
            setTimeout(() => setShowError(false), 5000); // hide error after 5s
          }
          if (status === 'downloaded') {
            setShowDownloaded(true);
          }
          return newState;
        });
      },
    );

    return () => {
      cleanup();
    };
  }, []);

  if (
    updaterState.status === 'idle' ||
    updaterState.status === 'checking' ||
    updaterState.status === 'not-available'
  ) {
    return null;
  }

  if (updaterState.status === 'error') {
    if (!showError) return null;
    return (
      <div className="fixed bottom-6 right-6 bg-[#1a1a1a] border border-gray-700 text-gray-300 p-4 rounded-xl shadow-2xl z-50 flex items-center gap-3">
        <Bell className="text-gray-500" size={20} />
        <span className="text-sm">
          Не удалось проверить обновления. Приложение продолжит работу.
        </span>
      </div>
    );
  }

  if (
    updaterState.status === 'available' ||
    updaterState.status === 'downloading'
  ) {
    const percent =
      updaterState.status === 'downloading'
        ? Math.round(updaterState.percent || 0)
        : 0;
    return (
      <div className="fixed bottom-6 right-6 bg-[#161616] border border-blue-900/50 p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-2 min-w-[280px]">
        <div className="flex items-center gap-3">
          <Activity className="text-blue-400 animate-pulse" size={20} />
          <span className="text-sm font-medium text-blue-100">
            Загружается обновление StreamerHub v{updaterState.version}
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1 overflow-hidden">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        <div className="text-right text-xs text-blue-400">{percent}%</div>
      </div>
    );
  }

  if (updaterState.status === 'downloaded' && showDownloaded) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#161616] border border-gray-700 rounded-xl p-8 max-w-md w-full shadow-2xl">
          <h3 className="text-xl font-bold mb-4 text-white">
            Обновление готово
          </h3>
          <p className="text-gray-300 mb-6">
            Обновление v{updaterState.version} готово. Перезапустить StreamerHub
            и установить обновление?
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowDownloaded(false)}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Позже
            </button>
            <button
              onClick={() => window.desktop?.updater.install()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all"
            >
              Перезапустить и обновить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
        active
          ? 'bg-blue-600/10 text-blue-400'
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200',
      )}
    >
      {icon}
      {label}
    </div>
  );
}

export default function App() {
  const [version, setVersion] = React.useState('Загрузка...');

  // Initialize theme at the root
  useTheme();

  React.useEffect(() => {
    if (window.desktop?.app?.getVersion) {
      window.desktop.app.getVersion().then(setVersion).catch(console.error);
    }
  }, []);

  const [obsState, setObsState] = React.useState<string>('disconnected');
  const [obsError, setObsError] = React.useState<string | null>(null);
  const [obsPassword, setObsPassword] = React.useState('');

  const [currentRoute, setCurrentRoute] = React.useState<
    | 'home'
    | 'feed'
    | 'collabs'
    | 'calendar'
    | 'my_obs'
    | 'remote_obs'
    | 'moderators'
    | 'notifications'
    | 'profile'
    | 'settings'
  >('home');
  const [obsSettingsOpen, setObsSettingsOpen] = React.useState(false);

  const [localObsDataSource] = React.useState(() => new LocalObsDataSource());
  const [remoteObsDataSource, setRemoteObsDataSource] =
    React.useState<RemoteObsDataSource | null>(null);

  const [incomingSession, setIncomingSession] = React.useState<{
    remoteSessionId: string;
    streamerAuthorization: string;
    moderatorId: string;
  } | null>(null);

  React.useEffect(() => {
    if (!window.desktop?.obs) return;
    const cleanup = window.desktop.obs.subscribe((event: unknown) => {
      setObsState((event as { state: string }).state);
      if ((event as { state: string }).state === 'connected') {
        setObsError(null);
      }
    });
    window.desktop.obs.getStatus().then(setObsState);
    return cleanup;
  }, []);

  React.useEffect(() => {
    if (!window.desktop?.remoteSessions) return;

    // We only connect signaling if we know we are authenticated.
    // AuthGate handles authentication state, but we need to check it here.
    window.desktop.auth.getState().then((state: unknown) => {
      if ((state as { authenticated: boolean }).authenticated) {
        window.desktop.signaling.connect();
      }
    });

    const cleanupIncoming = window.desktop.remoteSessions.onIncoming(
      (session: unknown) => {
        console.log('Incoming session', session);
        setIncomingSession(
          session as {
            remoteSessionId: string;
            streamerAuthorization: string;
            moderatorId: string;
          },
        );
      },
    );

    return () => {
      cleanupIncoming();
    };
  }, []);

  const acceptSession = async () => {
    if (!incomingSession) return;
    const sessionInfo = incomingSession;
    setIncomingSession(null);

    try {
      // 1. Authenticate with backend and verify token in Main
      const ctx = await window.desktop.remoteSessions.connect(
        sessionInfo.streamerAuthorization,
      );

      // 2. Start WebSocket Relay Transport
      const wsUrl = await window.desktop.api.getWsUrl();
      const transport = new WebSocketRelayTransport(
        `${wsUrl}/api/v1/signaling/session`,
      );
      await transport.connect({
        remoteSessionId: ctx.remoteSessionId,
        role: 'streamer',
        streamerAuthorization: sessionInfo.streamerAuthorization,
      });

      // Broadcast OBS snapshot when connected
      const cleanupObsEvent = window.desktop.obs.subscribe((event: unknown) => {
        const evt = event as {
          state: string;
          snapshot?: Record<string, unknown>;
        };
        if (evt.state === 'connected' && evt.snapshot) {
          transport.send({
            type: 'snapshot',
            payload: evt.snapshot,
          });
        }
      });

      // Handle incoming commands from the transport and pass them to the secure Main guard
      const unsubTransport = transport.subscribe(async (msg: unknown) => {
        type CommandMsg = {
          type: string;
          payload: {
            commandId: string;
            command: { commandName: string; commandData: unknown };
          };
        };
        const m = msg as CommandMsg;
        if (m.type === 'command.request') {
          try {
            const result = await window.desktop.remoteSessions.executeCommand(
              ctx.remoteSessionId,
              {
                command: m.payload.command.commandName,
                args: m.payload.command.commandData,
                seq: 0, // Mock sequence for now
              },
            );
            transport.send({
              type: 'command.response',
              payload: {
                commandId: m.payload.commandId,
                status: result.status,
                data: result.data,
              },
            });
          } catch (e: unknown) {
            transport.send({
              type: 'command.response',
              payload: {
                commandId: m.payload.commandId,
                status: 'error',
                error: (e as Error).message,
              },
            });
          }
        }
      });

      // Cleanup logic should be stored if we want to cancel the session later
    } catch (e: unknown) {
      console.error('Failed to accept session', e);
      alert('Failed to connect: ' + (e as Error).message);
    }
  };

  const handleLogout = () => window.desktop?.auth?.logout();

  const [obsPasswordVisible, setObsPasswordVisible] = React.useState(false);

  const handleConnectOBS = async () => {
    if (!window.desktop?.obs) return;
    setObsState('connecting');
    setObsError(null);
    try {
      const result = (await window.desktop.obs.connect({
        host: '127.0.0.1',
        port: 4455,
        password: obsPassword,
      })) as { success: boolean; error?: string };
      if (!result.success) {
        const err = result.error || 'unknown';
        setObsError(err);
        // Show password field automatically if auth is required
        if (err === 'authentication_required' || err === 'wrong_password') {
          setObsPasswordVisible(true);
        }
      }
    } catch (e: unknown) {
      setObsError('unknown');
    }
  };

  const handleClearObsSettings = async () => {
    if (!window.desktop?.obs) return;
    await window.desktop.obs.clearSettings();
    setObsPassword('');
    setObsError(null);
  };

  const startRemoteSession = async (directToken?: string) => {
    // Session is started via Moderators UI which always provides a token
    const token = directToken;
    if (!token) return;

    try {
      const ctx = await window.desktop.remoteSessions.connect(token);

      const wsUrl = await window.desktop.api.getWsUrl();
      const transport = new WebSocketRelayTransport(
        `${wsUrl}/api/v1/signaling/session`,
      );
      await transport.connect({
        remoteSessionId: ctx.remoteSessionId,
        role: 'moderator',
        moderatorAuthorization: token,
      });

      setRemoteObsDataSource(new RemoteObsDataSource(transport));
      setCurrentRoute('remote_obs');
    } catch (e: unknown) {
      alert('Failed to connect to session: ' + (e as Error).message);
    }
  };

  return (
    <AuthGate>
      <div
        className="flex h-screen w-screen font-sans overflow-hidden drag-region"
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <aside
          className="w-64 border-r flex flex-col no-drag"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="p-6 drag-region">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent pointer-events-none">
              StreamerHub
            </h1>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            <div className="text-xs font-semibold text-gray-500 mb-2 mt-4 px-3 uppercase tracking-wider">
              Социальное
            </div>
            <NavItem
              icon={<HomeIcon size={20} />}
              label="Главная"
              active={currentRoute === 'home'}
              onClick={() => setCurrentRoute('home')}
            />
            <NavItem
              icon={<Rss size={20} />}
              label="Лента"
              active={currentRoute === 'feed'}
              onClick={() => setCurrentRoute('feed')}
            />
            <NavItem
              icon={<Users size={20} />}
              label="Коллаборации"
              active={currentRoute === 'collabs'}
              onClick={() => setCurrentRoute('collabs')}
            />
            <NavItem
              icon={<CalendarIcon size={20} />}
              label="Календарь"
              active={currentRoute === 'calendar'}
              onClick={() => setCurrentRoute('calendar')}
            />

            <div className="text-xs font-semibold text-gray-500 mb-2 mt-6 px-3 uppercase tracking-wider">
              Студия
            </div>
            <NavItem
              icon={<MonitorPlay size={20} />}
              label="Мой OBS"
              active={currentRoute === 'my_obs'}
              onClick={() => setCurrentRoute('my_obs')}
            />
            <NavItem
              icon={<Globe size={20} />}
              label="Доступные OBS"
              active={currentRoute === 'remote_obs'}
              onClick={() => setCurrentRoute('remote_obs')}
            />
            <NavItem
              icon={<Shield size={20} />}
              label="Модераторы"
              active={currentRoute === 'moderators'}
              onClick={() => setCurrentRoute('moderators')}
            />

            <div className="text-xs font-semibold text-gray-500 mb-2 mt-6 px-3 uppercase tracking-wider">
              Аккаунт
            </div>
            <NavItem
              icon={<Bell size={20} />}
              label="Уведомления"
              active={currentRoute === 'notifications'}
              onClick={() => setCurrentRoute('notifications')}
            />
            <NavItem
              icon={<User size={20} />}
              label="Профиль"
              active={currentRoute === 'profile'}
              onClick={() => setCurrentRoute('profile')}
            />
            <NavItem
              icon={<SettingsIcon size={20} />}
              label="Настройки"
              active={currentRoute === 'settings'}
              onClick={() => setCurrentRoute('settings')}
            />
          </nav>

          <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
            <span>v{version}</span>
          </div>
        </aside>

        {/* Incoming Session Overlay */}
        {incomingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#161616] border border-gray-700 rounded-xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-4">
                Входящий запрос на управление
              </h3>
              <p className="text-gray-400 mb-6">
                Модератор пытается подключиться к вашему OBS.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setIncomingSession(null)}
                  className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Отклонить
                </button>
                <button
                  onClick={acceptSession}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all"
                >
                  Разрешить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Title Bar drag region for Windows when app is mostly no-drag */}
        <div className="absolute top-0 left-0 right-0 h-8 drag-region pointer-events-none" />

        <main className="flex-1 overflow-y-auto p-8 pt-12 no-drag">
          <div className="max-w-5xl mx-auto space-y-8">
            <RouteErrorBoundary
              key={currentRoute}
              onGoHome={() => setCurrentRoute('home')}
            >
              {currentRoute === 'my_obs' && (
                <>
                  <header>
                    <h2 className="text-3xl font-semibold text-gray-100">
                      Мой OBS
                    </h2>
                    <p className="text-gray-400 mt-2">
                      Локальное управление вашим OBS Studio.
                    </p>
                  </header>

                  <div className="max-w-md mx-auto">
                    <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg">
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                        <Activity
                          size={20}
                          className={
                            obsState === 'connected'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        />{' '}
                        Подключение OBS Studio
                      </h3>
                      {obsState === 'connected' ? (
                        <div className="space-y-4">
                          <div className="py-2 px-4 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20 text-center">
                            Успешно подключено к OBS
                          </div>
                          <button
                            onClick={() => window.desktop.obs.disconnect()}
                            className="w-full py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors border border-red-500/20"
                          >
                            Отключиться
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {obsError === 'obs_not_running' ? (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
                              <h4 className="text-yellow-400 font-medium mb-1">
                                OBS Studio не запущен
                              </h4>
                              <p className="text-yellow-200/70 text-sm">
                                Пожалуйста, откройте OBS Studio. Затем перейдите:
                                <strong> Сервис → Настройки сервера WebSocket</strong>.
                                Включите сервер, убедитесь что порт <strong>4455</strong>.
                                Если включён пароль — введите его ниже.
                              </p>
                            </div>
                          ) : obsError === 'timeout' ? (
                            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
                              <h4 className="text-orange-400 font-medium mb-1">
                                Превышено время ожидания
                              </h4>
                              <p className="text-orange-200/70 text-sm">
                                OBS не отвечает. Убедитесь, что OBS Studio
                                запущен и WebSocket сервер включён
                                (<strong>Сервис → Настройки сервера WebSocket</strong>,
                                порт <strong>4455</strong>).
                              </p>
                            </div>
                          ) : obsError === 'authentication_required' ||
                            obsError === 'wrong_password' ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                              <h4 className="text-red-400 font-medium mb-1">
                                {obsError === 'wrong_password'
                                  ? 'Неверный пароль'
                                  : 'Требуется пароль'}
                              </h4>
                              <p className="text-red-200/70 text-sm">
                                {obsError === 'wrong_password'
                                  ? 'Введённый пароль неверен. Проверьте настройки WebSocket в OBS.'
                                  : 'OBS защищён паролем. Введите пароль WebSocket ниже.'}
                              </p>
                            </div>
                          ) : obsError === 'unsupported' ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                              <h4 className="text-red-400 font-medium mb-1">
                                Версия OBS не поддерживается
                              </h4>
                              <p className="text-red-200/70 text-sm">
                                Обновите OBS Studio и плагин WebSocket до
                                последней версии.
                              </p>
                            </div>
                          ) : obsError ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                              <h4 className="text-red-400 font-medium mb-1">
                                Ошибка подключения
                              </h4>
                              <p className="text-red-200/70 text-sm">
                                Не удалось подключиться к OBS. Попробуйте ещё
                                раз.
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm mb-4">
                              Нажмите кнопку ниже для подключения к локальному
                              OBS Studio.
                            </p>
                          )}
                          <button
                            onClick={handleConnectOBS}
                            disabled={obsState === 'connecting'}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors shadow-lg shadow-blue-500/20"
                          >
                            {obsState === 'connecting'
                              ? 'Подключение...'
                              : obsError
                                ? 'Повторить попытку'
                                : 'Подключить OBS'}
                          </button>

                          {/* Password field: show when auth error or user clicks toggle */}
                          {(obsPasswordVisible ||
                            obsError === 'authentication_required' ||
                            obsError === 'wrong_password') && (
                            <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                              <label className="text-sm text-gray-400 block">
                                Пароль WebSocket:
                              </label>
                              <input
                                type="password"
                                value={obsPassword}
                                onChange={(e) => setObsPassword(e.target.value)}
                                placeholder="Пароль"
                                className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors"
                              />
                              {obsError && (
                                <button
                                  onClick={handleClearObsSettings}
                                  className="w-full py-2 mt-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                  Сбросить сохраненные настройки
                                </button>
                              )}
                            </div>
                          )}

                          {/* Link to show password field for users with a password-protected OBS */}
                          {!obsPasswordVisible &&
                            obsError !== 'authentication_required' &&
                            obsError !== 'wrong_password' && (
                              <button
                                onClick={() => setObsPasswordVisible(true)}
                                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                              >
                                OBS защищён паролем?
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {obsState === 'connected' && (
                    <ObsDashboard dataSource={localObsDataSource} />
                  )}
                </>
              )}

              {currentRoute === 'remote_obs' && (
                <>
                  <header>
                    <h2 className="text-3xl font-semibold text-gray-100">
                      Удаленный OBS
                    </h2>
                    <p className="text-gray-400 mt-2">
                      Управление OBS стримера через WebSocket Relay.
                    </p>
                  </header>

                  {!remoteObsDataSource ? (
                    <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 shadow-lg text-center">
                      <p className="text-gray-400 mb-4">
                        Вы не подключены к удаленному сеансу.
                      </p>
                      <p className="text-sm text-gray-500">
                        Удаленная сессия создается через раздел "Модераторы".
                      </p>
                    </div>
                  ) : (
                    <ObsDashboard dataSource={remoteObsDataSource} />
                  )}
                </>
              )}

              {currentRoute === 'home' && (
                <HomeView
                  obsState={obsState}
                  navigate={setCurrentRoute as (r: string) => void}
                />
              )}

              {currentRoute === 'feed' && <Feed />}
              {currentRoute === 'collabs' && <Collabs />}
              {currentRoute === 'calendar' && <Calendar />}
              {currentRoute === 'profile' && <Profile />}
              {currentRoute === 'notifications' && <Notifications />}
              {currentRoute === 'settings' && <Settings />}

              {currentRoute === 'moderators' && (
                <Moderators onConnectRemote={startRemoteSession} />
              )}
            </RouteErrorBoundary>
          </div>
        </main>

        <UpdateBanner />

        <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
      </div>
    </AuthGate>
  );
}
