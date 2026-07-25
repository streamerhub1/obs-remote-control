import React from 'react';
import { Button } from '@obs-remote/ui';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackType?: 'root' | 'route';
  onGoHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, we'd log this to an error tracking service (e.g. Sentry)
    // Make sure we do not log secrets/tokens.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReloadApp = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      // fallback for root boundary: full reload
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === 'development';
      const isRoute = this.props.fallbackType === 'route';

      return (
        <div
          className={`flex flex-col items-center justify-center p-8 text-center ${isRoute ? 'h-full bg-transparent' : 'h-screen w-screen bg-[#0A0A0A]'}`}
        >
          <div className="max-w-md space-y-6">
            <h1 className="text-2xl font-bold text-red-500">
              {isRoute
                ? 'В этом разделе произошла ошибка'
                : 'Произошла критическая ошибка'}
            </h1>

            <p className="text-gray-400">
              Приложение столкнулось с непредвиденной проблемой. Вы можете
              перезагрузить страницу или вернуться на главную.
            </p>

            {isDev && this.state.error && (
              <div className="bg-black/50 p-4 rounded-lg overflow-auto text-left max-h-40 border border-red-900/50">
                <p className="text-red-400 font-mono text-sm whitespace-pre-wrap">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex justify-center gap-4 pt-4">
              <Button onClick={this.handleGoHome} variant="outline">
                Вернуться на главную
              </Button>
              <Button onClick={this.handleReloadApp}>
                Перезагрузить приложение
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const RootErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <ErrorBoundary fallbackType="root">{children}</ErrorBoundary>;

export const RouteErrorBoundary: React.FC<{
  children: React.ReactNode;
  onGoHome?: () => void;
}> = ({ children, onGoHome }) => (
  <ErrorBoundary fallbackType="route" onGoHome={onGoHome}>
    {children}
  </ErrorBoundary>
);
