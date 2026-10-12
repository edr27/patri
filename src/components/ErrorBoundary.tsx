import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
          <div className="card p-8 max-w-lg w-full text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-danger-50 text-danger-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-surface-900 mb-2">
              Ops! Ocorreu um erro inesperado
            </h1>
            <p className="text-xs text-surface-500 mb-4">
              Um erro impediu a renderização deste componente.
            </p>
            {this.state.error?.message && (
              <pre className="bg-surface-100 text-danger-800 p-3 rounded-lg text-left text-xs font-mono mb-6 overflow-x-auto border border-surface-200">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <RotateCcw size={16} /> Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
