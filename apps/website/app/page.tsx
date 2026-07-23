import React from 'react';
import './page.css'; // We'll add some vanilla CSS here

export default function Home() {
  return (
    <div className="landing-container">
      <header className="navbar">
        <div className="logo">OBS Remote Control</div>
        <nav>
          <a href="#features">Features</a>
          <a href="#security">Security</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1>Управляйте стримом без задержек</h1>
            <p>Делегируйте управление сценами, микрофоном и источниками вашим модераторам через безопасную P2P-сеть.</p>
            <div className="cta-group">
              <button className="primary-btn" disabled>Windows-версия готовится</button>
            </div>
          </div>
          <div className="hero-preview">
            {/* Placeholder for desktop preview */}
            <div className="preview-window">
              <div className="preview-header">
                <span className="dot bg-red"></span>
                <span className="dot bg-yellow"></span>
                <span className="dot bg-green"></span>
              </div>
              <div className="preview-body">
                <div className="preview-sidebar"></div>
                <div className="preview-main">
                  <div className="preview-card"></div>
                  <div className="preview-card"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="features" className="features-section">
          <h2>Как работает удалённое управление?</h2>
          <div className="features-grid">
            <div className="feature">
              <h3>Без серверов посередине</h3>
              <p>Прямое соединение (WebRTC) между стримером и модератором гарантирует мгновенный отклик.</p>
            </div>
            <div className="feature">
              <h3>OBS WebSocket</h3>
              <p>Интеграция с официальным API OBS для полного контроля над сценами и источниками.</p>
            </div>
            <div className="feature">
              <h3>Twitch Auth</h3>
              <p>Удобный вход через Twitch. Подключения одобряются только для ваших проверенных модераторов.</p>
            </div>
          </div>
        </section>

        {/* Security & Roles */}
        <section id="security" className="security-section">
          <div className="content-box">
            <h2>Безопасность и P2P</h2>
            <p>Ваши данные не проходят через наши серверы. Сигнальный сервер используется только на этапе знакомства (handshake), после чего устанавливается защищенный P2P канал связи.</p>
            
            <div className="roles">
              <div className="role">
                <strong>Стример (Desktop)</strong>
                <p>Устанавливает приложение, подключает свой OBS и выдает права.</p>
              </div>
              <div className="role">
                <strong>Модератор (Web)</strong>
                <p>Заходит через браузер, получает доступ и управляет стримом.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="faq-section">
          <h2>Частые вопросы</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h4>Нужно ли модератору скачивать приложение?</h4>
              <p>Нет, модератор использует обычный веб-браузер.</p>
            </div>
            <div className="faq-item">
              <h4>Можно ли управлять с телефона?</h4>
              <p>Да, веб-интерфейс модератора адаптивен и работает на смартфонах.</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; {new Date().getFullYear()} OBS Remote Control. Open Source Project.</p>
        <div className="links">
          <a href="https://github.com/streamerhub1/obs-remote-control">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
