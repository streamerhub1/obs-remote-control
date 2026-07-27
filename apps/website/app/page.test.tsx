import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Home from './page';

describe('Home', () => {
  it('is exported as a component', () => {
    expect(typeof Home).toBe('function');
  });

  it('renders collaboration invite overlay from search params', () => {
    const html = renderToStaticMarkup(
      Home({
        searchParams: {
          invite: 'collab',
          title: 'Совместный стрим',
          category: 'Gaming',
          startAt: '2026-07-27T15:00:00.000Z',
          duration: '120',
          max: '4',
          mode: 'open',
          timezone: 'Asia/Qyzylorda',
          collabId: 'abc',
        },
      }),
    );

    expect(html).toContain('Приглашение в коллаборацию');
    expect(html).toContain('Совместный стрим');
    expect(html).toContain('Свободный вход');
    expect(html).toContain('Asia/Qyzylorda');
    expect(html).toContain('Принять приглашение');
  });
});
