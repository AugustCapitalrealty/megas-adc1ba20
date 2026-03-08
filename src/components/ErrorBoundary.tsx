import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-xl border-destructive/20">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl">Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
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
