import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <p className="text-4xl mb-4">😵</p>
          <h1 className="text-xl font-bold text-toss-text mb-2">문제가 발생했어요</h1>
          <p className="text-toss-sub mb-6">잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-toss-blue text-white font-medium hover:opacity-90"
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
