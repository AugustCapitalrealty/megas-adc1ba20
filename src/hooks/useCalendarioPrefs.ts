import { useEffect, useState } from 'react';

export type CalendarioModo = 'mes' | 'semana' | 'agenda';
export type CalendarioDensidade = 'compacto' | 'confortavel';

export interface CalendarioPrefs {
  modo: CalendarioModo;
  densidade: CalendarioDensidade;
  apenasRisco: boolean;
  heatmap: boolean;
}

const KEY = 'calendario:prefs:v1';

const DEFAULTS: CalendarioPrefs = {
  modo: 'mes',
  densidade: 'confortavel',
  apenasRisco: false,
  heatmap: false,
};

function read(): CalendarioPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function useCalendarioPrefs() {
  const [prefs, setPrefs] = useState<CalendarioPrefs>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* noop */
    }
  }, [prefs]);

  const update = <K extends keyof CalendarioPrefs>(key: K, value: CalendarioPrefs[K]) =>
    setPrefs(prev => ({ ...prev, [key]: value }));

  return { prefs, setPrefs, update };
}
