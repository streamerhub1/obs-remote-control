// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { AuthGate } from '../src/renderer/AuthGate';

describe('AuthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup window.desktop mock
    (window as any).desktop = {
      auth: {
        getState: vi.fn().mockResolvedValue({ authenticated: false }),
        subscribe: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
      }
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading state initially', () => {
    // We delay the promise to keep it in loading state
    (window as any).desktop.auth.getState = vi.fn().mockImplementation(() => new Promise(() => {}));
    
    render(
      <AuthGate>
        <div data-testid="app-content">App Content</div>
      </AuthGate>
    );

    expect(screen.getByText('Загрузка...')).toBeDefined();
    expect(screen.queryByTestId('app-content')).toBeNull();
  });

  it('shows login screen when not authenticated', async () => {
    (window as any).desktop.auth.getState = vi.fn().mockResolvedValue({ authenticated: false });
    
    render(
      <AuthGate>
        <div data-testid="app-content">App Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText('Войти через Twitch')).toBeDefined();
    });
    expect(screen.queryByTestId('app-content')).toBeNull();
  });

  it('shows children when authenticated', async () => {
    (window as any).desktop.auth.getState = vi.fn().mockResolvedValue({ authenticated: true });
    
    render(
      <AuthGate>
        <div data-testid="app-content">App Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeDefined();
    });
    expect(screen.queryByText('Войти через Twitch')).toBeNull();
  });
});
