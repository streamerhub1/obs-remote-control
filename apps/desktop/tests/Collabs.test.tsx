// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { Collabs } from '../src/renderer/Collabs';

describe('Collabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { desktop: unknown }).desktop = {
      api: {
        collabs: {
          list: vi.fn(),
          create: vi.fn(),
          apply: vi.fn(),
          join: vi.fn(),
        },
      },
    };
  });

  afterEach(() => cleanup());

  it('uses response.data and renders nullable category safely', async () => {
    const desktop = (window as unknown as { desktop: { api: { collabs: { list: ReturnType<typeof vi.fn> } } } }).desktop;
    desktop.api.collabs.list.mockResolvedValue({
      data: [
        {
          id: 'collab1',
          title: 'Late stream',
          description: null,
          category: null,
          startAt: new Date(Date.now() + 3600000).toISOString(),
          expectedDurationMinutes: 90,
          timezone: 'Asia/Qyzylorda',
          maximumParticipants: 4,
          currentParticipants: 1,
          applicationMode: 'approval',
          visibility: 'public',
          host: { id: 'host1', displayName: 'Host', avatarUrl: null },
          myApplication: null,
        },
      ],
      nextCursor: null,
    });

    render(<Collabs />);

    await waitFor(() => {
      expect(screen.getByText('Late stream')).toBeDefined();
      expect(screen.getByText('Без категории')).toBeDefined();
      expect(screen.getByText('Часовой пояс: Asia/Qyzylorda')).toBeDefined();
    });
  });
});
