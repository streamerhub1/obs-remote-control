// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { Feed } from '../src/renderer/Feed';

describe('Feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { desktop: unknown }).desktop = {
      api: {
        profile: {
          getMe: vi.fn().mockResolvedValue({ displayName: 'Me', avatarUrl: null }),
        },
        feed: {
          list: vi.fn(),
          create: vi.fn(),
          like: vi.fn(),
          comments: {
            list: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
            create: vi.fn(),
          },
        },
      },
    };
  });

  afterEach(() => cleanup());

  it('shows empty state when no posts', async () => {
    (window as unknown as { desktop: { api: { feed: { list: ReturnType<typeof vi.fn> } } } }).desktop.api.feed.list.mockResolvedValue({ data: [], nextCursor: null });

    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByText('В ленте пока нет публикаций.')).toBeDefined();
    });
  });

  it('displays a valid post correctly', async () => {
    (window as unknown as { desktop: { api: { feed: { list: ReturnType<typeof vi.fn> } } } }).desktop.api.feed.list.mockResolvedValue({
      data: [
        {
          id: 'post1',
          content: 'Hello world',
          likesCount: 10,
          commentsCount: 2,
          createdAt: new Date().toISOString(),
          author: { id: 'author1', displayName: 'TestUser', twitchLogin: 'testuser', avatarUrl: null },
        },
      ],
      nextCursor: null,
    });

    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeDefined();
      expect(screen.getByText('TestUser')).toBeDefined();
      expect(screen.getByText('10')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined();
    });
  });

  it('calls create post and refetches', async () => {
    const desktop = (window as unknown as { desktop: { api: { feed: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } } } }).desktop;
    desktop.api.feed.list.mockResolvedValue({ data: [], nextCursor: null });
    desktop.api.feed.create.mockResolvedValue(null);

    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Что нового, стример?')).toBeDefined();
    });

    fireEvent.change(screen.getByPlaceholderText('Что нового, стример?'), { target: { value: 'New Test Post' } });
    fireEvent.click(screen.getByText('Опубликовать'));

    await waitFor(() => {
      expect(desktop.api.feed.create).toHaveBeenCalledWith({ content: 'New Test Post' });
      expect(desktop.api.feed.list).toHaveBeenCalledTimes(2);
    });
  });

  it('opens comments, creates a comment, and updates the counter', async () => {
    const desktop = (window as unknown as { desktop: { api: { feed: { list: ReturnType<typeof vi.fn>; comments: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } } } } }).desktop;
    desktop.api.feed.list.mockResolvedValue({
      data: [
        {
          id: 'post1',
          content: 'Comment me',
          likesCount: 0,
          commentsCount: 0,
          createdAt: new Date().toISOString(),
          author: { id: 'author1', displayName: 'TestUser', twitchLogin: 'testuser', avatarUrl: null },
        },
      ],
      nextCursor: null,
    });
    desktop.api.feed.comments.list.mockResolvedValue({ data: [], nextCursor: null });
    desktop.api.feed.comments.create.mockResolvedValue({ id: 'comment1' });

    render(<Feed />);

    await waitFor(() => expect(screen.getByText('Comment me')).toBeDefined());
    fireEvent.click(screen.getAllByText('0')[1].closest('button')!);

    await waitFor(() => expect(screen.getByPlaceholderText('Написать комментарий')).toBeDefined());
    fireEvent.change(screen.getByPlaceholderText('Написать комментарий'), { target: { value: 'Nice' } });
    fireEvent.click(screen.getByTitle('Отправить комментарий'));

    await waitFor(() => {
      expect(desktop.api.feed.comments.create).toHaveBeenCalledWith('post1', { content: 'Nice' });
      expect(screen.getByText('1')).toBeDefined();
    });
  });
});

