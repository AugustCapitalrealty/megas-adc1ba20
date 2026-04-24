import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';

interface Options {
  items: SolicitacaoBackoffice[];
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  onOpenDetails: (sol: SolicitacaoBackoffice) => void;
  onAssumir?: (sol: SolicitacaoBackoffice) => void;
  onToggleSelect?: (id: string) => void;
  enabled?: boolean;
}

/**
 * Power-user keyboard shortcuts for the backoffice list.
 * j / ↓  → next row
 * k / ↑  → previous row
 * Enter  → open details of focused row
 * a      → assumir focused row (if eligible)
 * x      → toggle selection of focused row
 */
export function useBackofficeShortcuts({
  items,
  focusedId,
  setFocusedId,
  onOpenDetails,
  onAssumir,
  onToggleSelect,
  enabled = true,
}: Options) {
  // keep latest refs to avoid stale closures inside hotkey callbacks
  const itemsRef = useRef(items);
  const focusedRef = useRef(focusedId);
  itemsRef.current = items;
  focusedRef.current = focusedId;

  const move = (delta: 1 | -1) => {
    const list = itemsRef.current;
    if (list.length === 0) return;
    const current = focusedRef.current;
    const idx = current ? list.findIndex(i => i.id === current) : -1;
    let next = idx + delta;
    if (next < 0) next = 0;
    if (next > list.length - 1) next = list.length - 1;
    const target = list[next];
    if (!target) return;
    setFocusedId(target.id);
    // best-effort scroll into view
    queueMicrotask(() => {
      const el = document.querySelector<HTMLElement>(`[data-row-id="${target.id}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };

  const opts = {
    enabled,
    enableOnFormTags: false as const,
    preventDefault: true,
  };

  useHotkeys('j, down', () => move(1), opts, [enabled]);
  useHotkeys('k, up', () => move(-1), opts, [enabled]);

  useHotkeys(
    'enter',
    () => {
      const list = itemsRef.current;
      const sol = list.find(i => i.id === focusedRef.current);
      if (sol) onOpenDetails(sol);
    },
    opts,
    [enabled, onOpenDetails],
  );

  useHotkeys(
    'a',
    () => {
      const list = itemsRef.current;
      const sol = list.find(i => i.id === focusedRef.current);
      if (sol && onAssumir && ['recebido', 'em_analise'].includes(sol.status)) {
        onAssumir(sol);
      }
    },
    opts,
    [enabled, onAssumir],
  );

  useHotkeys(
    'x',
    () => {
      if (focusedRef.current && onToggleSelect) onToggleSelect(focusedRef.current);
    },
    opts,
    [enabled, onToggleSelect],
  );

  // When the visible list changes, ensure the focused id still exists; otherwise focus the first one.
  useEffect(() => {
    if (!enabled) return;
    if (items.length === 0) {
      if (focusedId !== null) setFocusedId(null);
      return;
    }
    if (!focusedId || !items.some(i => i.id === focusedId)) {
      setFocusedId(items[0].id);
    }
  }, [enabled, items, focusedId, setFocusedId]);
}