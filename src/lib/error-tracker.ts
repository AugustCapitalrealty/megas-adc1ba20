import { supabase } from '@/integrations/supabase/client';

type Severity = 'error' | 'warning' | 'fatal';

interface CaptureOptions {
  severity?: Severity;
  source?: string;
  context?: Record<string, unknown>;
}

const recent = new Map<string, number>();
const DEDUP_MS = 10_000;

function fingerprint(message: string, source?: string): string {
  const norm = `${source ?? ''}::${message.slice(0, 200)}`;
  let h = 0;
  for (let i = 0; i < norm.length; i++) {
    h = (h << 5) - h + norm.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export async function captureError(error: unknown, options: CaptureOptions = {}): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message || 'Unknown error';
    const stack = err.stack ?? null;
    const source = options.source ?? 'app';
    const fp = fingerprint(message, source);

    const now = Date.now();
    const last = recent.get(fp);
    if (last && now - last < DEDUP_MS) return;
    recent.set(fp, now);
    if (recent.size > 100) {
      const cutoff = now - DEDUP_MS * 3;
      recent.forEach((t, k) => { if (t < cutoff) recent.delete(k); });
    }

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('error_logs').insert([{
      user_id: user?.id ?? null,
      message,
      stack,
      source,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      severity: options.severity ?? 'error',
      context: (options.context ?? {}) as never,
      fingerprint: fp,
    }]);
  } catch (e) {
    console.debug('[error-tracker] capture failed:', e);
  }
}

export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { __megasErrTracker?: boolean }).__megasErrTracker) return;
  (window as unknown as { __megasErrTracker?: boolean }).__megasErrTracker = true;

  window.addEventListener('error', (event) => {
    captureError(event.error ?? event.message, {
      source: 'window.onerror',
      context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, { source: 'unhandledrejection', severity: 'error' });
  });
}
