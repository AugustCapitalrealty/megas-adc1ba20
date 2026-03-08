import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fire-and-forget analytics tracking hook.
 * Inserts into analytics_events without blocking the UI.
 * Debounces duplicate events within 2s window.
 */
export function useTrackEvent() {
  const { user } = useAuth();
  const recentEvents = useRef<Map<string, number>>(new Map());
  const DEBOUNCE_MS = 2000;

  const track = useCallback(
    (eventName: string, eventData: Record<string, unknown> = {}, page?: string) => {
      if (!user?.id) return;

      // Debounce: skip if same event fired within window
      const key = `${eventName}:${JSON.stringify(eventData)}`;
      const now = Date.now();
      const last = recentEvents.current.get(key);
      if (last && now - last < DEBOUNCE_MS) return;
      recentEvents.current.set(key, now);

      // Clean old entries periodically
      if (recentEvents.current.size > 50) {
        const cutoff = now - DEBOUNCE_MS * 2;
        recentEvents.current.forEach((ts, k) => {
          if (ts < cutoff) recentEvents.current.delete(k);
        });
      }

      // Fire-and-forget insert
      supabase
        .from('analytics_events')
        .insert([{
          user_id: user.id,
          event_name: eventName,
          event_data: eventData as any,
          page: page ?? window.location.pathname,
        }])
        .then(({ error }) => {
          if (error) console.debug('[Analytics] Insert failed:', error.message);
        });
    },
    [user?.id]
  );

  return track;
}
