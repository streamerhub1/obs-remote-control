import React from 'react';
import Link from 'next/link';
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe2,
  HeartHandshake,
  MonitorUp,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react';

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatInviteDate(startAt?: string, timezone?: string) {
  if (!startAt) return 'Время не указано';
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return 'Время не указано';

  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || undefined,
  });
}

function parseInvite(searchParams?: SearchParams) {
  if (firstParam(searchParams?.invite) !== 'collab') return null;

  const title = firstParam(searchParams?.title) || 'Коллаборация StreamerHub';
  const category = firstParam(searchParams?.category) || 'Без категории';
  const startAt = firstParam(searchParams?.startAt);
  const timezone = firstParam(searchParams?.timezone) || 'UTC';
  const duration = firstParam(searchParams?.duration);
  const max = firstParam(searchParams?.max);
  const mode = firstParam(searchParams?.mode);
  const collabId = firstParam(searchParams?.collabId);

  return {
    title,
    category,
    date: formatInviteDate(startAt, timezone),
    timezone,
    duration: duration ? `${duration} мин.` : 'Не указана',
    max: max ? `${max} участников` : 'Не указан',
    mode: mode === 'open' ? 'Свободный вход' : 'По заявкам',
    acceptHref: collabId ? `/collabs?collabId=${encodeURIComponent(collabId)}&action=accept` : '/collabs',
  };
}

const features = [
  {
    icon: Users,
    title: 'Профили стримеров',
    text: 'Профиль синхронизируется с Twitch, но остаётся редактируемым внутри приложения.',
  },
  {
    icon: Radio,
    title: 'Лента сообщества',
    text: 'Публичные посты, лайки, комментарии и вкладки для всех публикаций, подписок и рекомендаций.',
  },
  {
    icon: CalendarDays,
    title: 'Календарь',
    text: 'Личные события, стримы и коллаборации попадают в расписание и показываются на главной.',
  },
  {
    icon: HeartHandshake,
    title: 'Коллаборации',
    text: 'Создание совместных стримов, ссылки-приглашения, заявки и открытый вход по правилам автора.',
  },
  {
    icon: MonitorUp,
    title: 'OBS управление',
    text: 'Подключение к OBS WebSocket 4455, сцены, источники, аудио и управление трансляцией.',
  },
  {
    icon: ShieldCheck,
    title: 'Модераторы',
    text: 'Назначение по Twitch логину или id профиля, простые права доступа и запрос удалённой сессии.',
  },
  {
    icon: Bell,
    title: 'Уведомления',
    text: 'Системные события по комментариям, назначениям модераторов и действиям в сообществе.',
  },
  {
    icon: Globe2,
    title: 'Публичные ссылки',
    text: 'Приглашения открываются на сайте, где участник видит детали перед принятием.',
  },
];

export default function Home({ searchParams }: { searchParams?: SearchParams }) {
  const invite = parseInvite(searchParams);

  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(135deg,rgba(37,99,235,.25),rgba(168,85,247,.18),rgba(8,9,11,0))]" />

      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#08090b]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-sm">SH</span>
            <span>StreamerHub</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/collabs" className="hidden text-gray-300 hover:text-white sm:inline">Коллаборации</Link>
            <a
              href="https://github.com/streamerhub1/obs-remote-control/releases/latest"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-medium text-black hover:bg-gray-200"
            >
              <Download className="h-4 w-4" />
              Скачать
            </a>
          </div>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-16 lg:grid-cols-[1fr_520px] lg:items-center lg:pt-24">
        <div className="relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100">
            <Activity className="h-4 w-4 text-blue-300" />
            Desktop центр для стримеров и модераторов
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl lg:text-6xl">
              StreamerHub
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-gray-300">
              Управляйте OBS, расписанием, коллаборациями, профилем и сообществом из одного приложения. Модераторы получают ровно те права, которые вы назначили.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="https://github.com/streamerhub1/obs-remote-control/releases/latest"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500"
            >
              <Download className="h-5 w-5" />
              Скачать для Windows
            </a>
            <Link
              href="/collabs"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 font-medium text-gray-100 hover:bg-white/5"
            >
              Смотреть коллаборации
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative z-10 rounded-xl border border-white/10 bg-[#111318] p-4 shadow-2xl shadow-black/30">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <div className="text-sm text-gray-400">Главная</div>
              <div className="font-medium">Ближайший стрим и OBS</div>
            </div>
            <span className="rounded-md bg-green-500/15 px-2 py-1 text-xs text-green-300">live ready</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <CalendarDays className="mb-3 h-5 w-5 text-blue-300" />
              <div className="font-medium">Сегодня, 20:00</div>
              <div className="mt-1 text-sm text-gray-400">Коллаборация Minecraft</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <MonitorUp className="mb-3 h-5 w-5 text-purple-300" />
              <div className="font-medium">OBS WebSocket</div>
              <div className="mt-1 text-sm text-gray-400">Сцены, аудио, источники</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4 sm:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-sm text-gray-400">
                <Users className="h-4 w-4" /> Модераторы
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs text-gray-300">
                {['Сцены', 'Источники', 'Аудио', 'Стрим'].map((item) => (
                  <span key={item} className="rounded-md bg-white/5 px-2 py-2">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <Icon className="mb-4 h-6 w-6 text-blue-300" />
                <h2 className="font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0d0f13] px-5 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          {[
            ['1', 'Войдите через Twitch', 'Профиль и аватар подтянутся автоматически.'],
            ['2', 'Подключите OBS', 'Укажите пароль WebSocket из OBS Studio, если он включён.'],
            ['3', 'Назначьте модераторов', 'Выберите простые группы прав и подтвердите удалённую сессию.'],
          ].map(([step, title, text]) => (
            <div key={step} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 font-semibold">{step}</span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-400">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-gray-500">
        © 2026 StreamerHub
      </footer>

      {invite && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-white/10 bg-[#111318] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                  <HeartHandshake className="h-4 w-4" /> Приглашение в коллаборацию
                </div>
                <h2 className="text-2xl font-semibold">{invite.title}</h2>
                <p className="mt-2 text-sm text-gray-400">Проверьте детали совместного стрима перед принятием.</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-300" />
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-black/30 p-3">
                <dt className="text-gray-500">Категория</dt>
                <dd className="mt-1 font-medium">{invite.category}</dd>
              </div>
              <div className="rounded-lg bg-black/30 p-3">
                <dt className="text-gray-500">Дата и время</dt>
                <dd className="mt-1 font-medium">{invite.date}</dd>
              </div>
              <div className="rounded-lg bg-black/30 p-3">
                <dt className="text-gray-500">Длительность</dt>
                <dd className="mt-1 font-medium">{invite.duration}</dd>
              </div>
              <div className="rounded-lg bg-black/30 p-3">
                <dt className="text-gray-500">Участники</dt>
                <dd className="mt-1 font-medium">{invite.max}</dd>
              </div>
              <div className="rounded-lg bg-black/30 p-3">
                <dt className="text-gray-500">Режим</dt>
                <dd className="mt-1 font-medium">{invite.mode}</dd>
              </div>
              <div className="rounded-lg bg-black/30 p-3">
                <dt className="text-gray-500">Часовой пояс</dt>
                <dd className="mt-1 font-medium">{invite.timezone}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={invite.acceptHref} className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500">
                Принять приглашение
              </Link>
              <a
                href="https://github.com/streamerhub1/obs-remote-control/releases/latest"
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/15 px-5 py-3 font-medium text-gray-100 hover:bg-white/5"
              >
                Скачать Desktop
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
