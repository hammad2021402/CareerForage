import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  children: ReactNode;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

interface State {
  hasError: boolean;
}

export class CardErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[APEX CardError]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className={cn(
          'flex flex-col items-center justify-center p-6 min-h-[180px] rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] text-center',
          this.props.className
        )}>
          <AlertCircle className="w-8 h-8 text-[var(--rose)] mb-2" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Unable to load {this.props.title || 'data'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry?.();
            }}
            className="mt-3 px-3.5 py-1.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all active:scale-[0.98]"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CardErrorBoundary;
