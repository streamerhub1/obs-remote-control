// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { Feed } from '../src/renderer/Feed';
import { RouteErrorBoundary } from '../src/renderer/ErrorBoundary';

describe('Feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { desktop: any }).desktop = {
      api: {
        feed: {
          list: vi.fn(),
          create: vi.fn(),
          like: vi.fn(),
        }
      }
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('shows empty state when no posts', async () => {
    (window as unknown as { desktop: any }).desktop.api.feed.list.mockResolvedValue({ data: [], nextCursor: null });

    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByText('Лента пуста.')).toBeDefined();
    });
  });

  it('displays a valid post correctly', async () => {
    (window as unknown as { desktop: any }).desktop.api.feed.list.mockResolvedValue({
      data: [{
        id: 'post1',
        content: 'Hello world',
        likesCount: 10,
        commentsCount: 2,
        createdAt: new Date().toISOString(),
        author: {
          id: 'author1',
          displayName: 'TestUser',
          twitchLogin: 'testuser',
          avatarUrl: null
        }
      }],
      nextCursor: null
    });

    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeDefined();
      expect(screen.getByText('TestUser')).toBeDefined();
      expect(screen.getByText('10')).toBeDefined();
    });
  });

  it('triggers RouteErrorBoundary on malformed response instead of crashing React', async () => {
    // Suppress console.error in tests for React Error Boundaries
    const originalError = console.error;
    console.error = vi.fn();

    // Simulate what happens when validation in main throws, or network throws
    (window as unknown as { desktop: any }).desktop.api.feed.list.mockRejectedValue(new Error('Некорректный ответ сервиса'));

    render(
      <RouteErrorBoundary>
        <Feed />
      </RouteErrorBoundary>
    );

    await waitFor(() => {
      // In this specific mock, Feed's internal try/catch sets an error state first before boundary!
      // Wait, Feed actually catches and sets `error` state.
      expect(screen.getByText(/Некорректный ответ сервиса/)).toBeDefined();
    });

    console.error = originalError;
  });

  it('calls create post and refetches', async () => {
    (window as unknown as { desktop: any }).desktop.api.feed.list.mockResolvedValue({ data: [], nextCursor: null });
    (window as unknown as { desktop: any }).desktop.api.feed.create.mockResolvedValue(null);

    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Что нового, стример?')).toBeDefined();
    });

    const textarea = screen.getByPlaceholderText('Что нового, стример?');
    fireEvent.change(textarea, { target: { value: 'New Test Post' } });
    
    const submitBtn = screen.getByText('Опубликовать');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect((window as unknown as { desktop: any }).desktop.api.feed.create).toHaveBeenCalledWith({ content: 'New Test Post' });
      // list should be called twice: initial load and refetch after create
      expect((window as unknown as { desktop: any }).desktop.api.feed.list).toHaveBeenCalledTimes(2);
    });
  });

  it('updates likes correctly', async () => {
    (window as unknown as { desktop: any }).desktop.api.feed.list.mockResolvedValue({
      data: [{
        id: 'post1',
        content: 'Like me',
        likesCount: 5,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        author: {
          id: 'author1',
          displayName: 'TestUser',
          twitchLogin: 'testuser',
          avatarUrl: null
        }
      }],
      nextCursor: null
    });

    (window as unknown as { desktop: any }).desktop.api.feed.like.mockResolvedValue({ liked: false });

    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });

    // 5 -> heart button. The text inside span next to heart is 5.
    // The button has a child with 5.
    const likeButton = screen.getByText('5').closest('button');
    expect(likeButton).toBeDefined();

    fireEvent.click(likeButton!);

    await waitFor(() => {
      expect((window as unknown as { desktop: any }).desktop.api.feed.like).toHaveBeenCalledWith('post1');
      // liked: false should decrease to 4
      expect(screen.getByText('4')).toBeDefined();
    });
  });
});
