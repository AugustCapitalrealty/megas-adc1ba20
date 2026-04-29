import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { captureError } from '@/lib/error-tracker';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    // Stale-chunk recovery: app was redeployed and the cached index.html points
    // to JS chunks that no longer exist. Try a single hard reload before
    // showing the error UI. Flag in sessionStorage prevents reload loops.
    const msg = error?.message || '';
    const isChunkErr = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);
    if (isChunkErr && typeof window !== 'undefined') {
      try {
        const flag = sessionStorage.getItem('lov-chunk-reload');
        if (!flag) {
          sessionStorage.setItem('lov-chunk-reload', String(Date.now()));
          window.location.reload();
          return { hasError: false, error: null };
        }
      } catch { /* ignore storage errors */ }
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    captureError(error, {
      source: 'ErrorBoundary',
      severity: 'fatal',
      context: { componentStack: errorInfo.componentStack },
    });
  }

  handleRetry = () => {
    try { sessionStorage.removeItem('lov-chunk-reload'); } catch { /* noop */ }
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    try { sessionStorage.removeItem('lov-chunk-reload'); } catch { /* noop */ }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const msg = this.state.error?.message || '';
      const isChunkErr = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-xl border-destructive/20">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl">
                {isChunkErr ? 'Versão desatualizada' : 'Algo deu errado'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isChunkErr
                  ? 'O app foi atualizado e seu navegador está com a versão antiga em cache. Recarregue a página com Ctrl+Shift+R (ou Cmd+Shift+R no Mac), ou abra em uma janela anônima.'
                  : 'Ocorreu um erro inesperado. Tente novamente ou recarregue a página.'}
              </p>
              {this.state.error && (
                <details className="text-left text-xs bg-muted/50 rounded-md p-3">
                  <summary className="cursor-pointer text-muted-foreground font-medium">
                    Detalhes técnicos
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-destructive/80">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={this.handleRetry} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
                <Button onClick={this.handleReload}>
                  Recarregar página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
