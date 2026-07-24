import Link from 'next/link';
import { Button } from '@obs-remote/ui';
import { ArrowRight, Globe, Users, Tv } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-blue-500/30">
      <nav className="border-b border-gray-800 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
              SH
            </div>
            <span className="font-semibold text-lg tracking-tight">
              StreamerHub
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-300">
            <Link
              href="/collabs"
              className="hover:text-white transition-colors"
            >
              Коллаборации
            </Link>
            <Link
              href="/features"
              className="hover:text-white transition-colors"
            >
              Возможности
            </Link>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Скачать для Desktop
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0A0A0A] to-[#0A0A0A] -z-10" />

          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">
              Единое пространство <br /> для стримеров
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Находите партнеров для коллабораций, обменивайтесь аудиторией, и
              управляйте своим OBS из любой точки мира вместе с модераторами.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-200"
              >
                Создать профиль
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Искать коллаборации
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 border-t border-gray-800/50 bg-[#111111]/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold">Социальная сеть</h3>
                <p className="text-gray-400 leading-relaxed">
                  Первая социальная сеть специально для стримеров. Лента
                  новостей, профили, поиск партнеров по категориям и языкам.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Globe className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold">Биржа коллабораций</h3>
                <p className="text-gray-400 leading-relaxed">
                  Создавайте открытые коллаборации, подавайте заявки и растите
                  вместе. Удобный календарь интегрирован в приложение.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <Tv className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold">Удаленный OBS</h3>
                <p className="text-gray-400 leading-relaxed">
                  Дайте модераторам безопасный доступ к вашему OBS через WebRTC.
                  Переключение сцен, звука и управление стримом без передачи
                  паролей.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-12 px-6 text-center text-gray-500">
        <p>© 2026 StreamerHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
