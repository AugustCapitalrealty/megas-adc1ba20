import { useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { SolicitacaoComFornecedor } from '@/components/solicitante/types';

interface Options {
  items: SolicitacaoComFornecedor[];
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  onOpen: (sol: SolicitacaoComFornecedor) => void;
  enabled?: boolean;
}

/**
 * Power-user keyboard shortcuts for the solicitante list.
 * j / ↓  → next row
 * k / ↑  → previous row
 * Enter  → open / expand focused row
 * (no `a` / `x` here — those are backoffice-only)
 */
export function useSolicitanteShortcuts({
  items,
  focusedId,
  setFocusedId,
  onOpen,
  enabled = true,
}: Options) {
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
      if (sol) onOpen(sol);
    },
    opts,
    [enabled, onOpen],
  );

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
