import { Loader2 } from 'lucide-react';

interface PageLoadingFallbackProps {
  fullscreen?: boolean;
  message?: string;
}

export function PageLoadingFallback({
  fullscreen = false,
  message = 'Carregando página...',
}: PageLoadingFallbackProps) {
  return (
    <div
      className={fullscreen
        ? 'min-h-screen flex items-center justify-center bg-background gap-2 text-muted-foreground'
        : 'w-full min-h-[40vh] flex items-center justify-center gap-2 text-muted-foreground'}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
