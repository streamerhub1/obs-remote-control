import Link from 'next/link';
import { Tv, Shield, Zap, ArrowRight, Play } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
        <div className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
          StreamerHub
        </div>
        <div className="flex gap-6 items-center">
          <Link href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Возможности</Link>
          <Link href="#security" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Безопасность</Link>
          <a href="http://localhost:3000/auth/twitch/login" className="text-sm font-semibold bg-white text-black px-5 py-2.5 rounded-full hover:bg-gray-200 transition-all transform hover:scale-105">
            Войти через Twitch
          </a>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-40 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-8 relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300 mb-8 backdrop-blur-sm">
              <span className="flex w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              Версия 1.0 уже доступна
            </div>
            
            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1]">
              Управляй стримом <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                из любой точки
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mb-12">
              Безопасное удаленное управление OBS Studio для вас и ваших модераторов. 
              Работает через зашифрованную P2P сеть без проброса портов.
            </p>
            
            <div className="flex gap-4">
              <a href="http://localhost:3000/auth/twitch/login" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(147,51,234,0.5)]">
                <Tv size={20} />
                Начать работу
              </a>
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all">
                <Play size={20} />
                Смотреть демо
              </button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-32 bg-[#0d0d0d] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-8">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-20">Всё необходимое для <span className="text-purple-400">идеального стрима</span></h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-[#111] p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-colors group">
                <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Tv className="text-purple-400" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Десктопное приложение</h3>
                <p className="text-gray-400 leading-relaxed">
                  Легкий клиент на базе Electron, который автоматически подключается к вашему OBS через WebSockets.
                </p>
              </div>

              <div className="bg-[#111] p-8 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                <div className="bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="text-blue-400" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Делегирование прав</h3>
                <p className="text-gray-400 leading-relaxed">
                  Выдавайте доступ модераторам к определенным сценам или источникам без передачи паролей.
                </p>
              </div>

              <div className="bg-[#111] p-8 rounded-3xl border border-white/5 hover:border-green-500/30 transition-colors group">
                <div className="bg-green-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="text-green-400" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Мгновенный отклик</h3>
                <p className="text-gray-400 leading-relaxed">
                  Прямое P2P соединение обеспечивает минимальную задержку при переключении сцен и управлении звуком.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">Готовы прокачать свой стрим?</h2>
            <p className="text-xl text-gray-400 mb-10">Присоединяйтесь к тысячам стримеров, которые уже автоматизировали свою работу.</p>
            <a href="http://localhost:3000/auth/twitch/login" className="inline-flex items-center gap-2 bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-gray-200 hover:scale-105 transition-all">
              Начать бесплатно <ArrowRight size={20} />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-12 text-center text-gray-500">
        <p>© 2026 StreamerHub. В рамках проекта OBS Remote Control.</p>
      </footer>
    </div>
  );
}
