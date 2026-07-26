import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CompetenciaContextValue {
  currentCompId: string | null;
  setCurrentCompId: (id: string | null) => void;
  /** Increments whenever a competência is created/updated, so listeners refetch. */
  version: number;
  bumpCompetencias: () => void;
}

const CompetenciaContext = createContext<CompetenciaContextValue | null>(null);

export function CompetenciaProvider({ children }: { children: ReactNode }) {
  const [currentCompId, setCurrentCompId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const bumpCompetencias = useCallback(() => setVersion((v) => v + 1), []);
  return (
    <CompetenciaContext.Provider value={{ currentCompId, setCurrentCompId, version, bumpCompetencias }}>
      {children}
    </CompetenciaContext.Provider>
  );
}

/**
 * Shared competência selection across the energy tabs. Falls back to local
 * state when used outside the provider so each tab still works in isolation.
 */
export function useSharedCompetencia(): CompetenciaContextValue {
  const ctx = useContext(CompetenciaContext);
  const [local, setLocal] = useState<string | null>(null);
  const [localVersion, setLocalVersion] = useState(0);
  const bumpLocal = useCallback(() => setLocalVersion((v) => v + 1), []);
  if (ctx) return ctx;
  return {
    currentCompId: local,
    setCurrentCompId: setLocal,
    version: localVersion,
    bumpCompetencias: bumpLocal,
  };
}