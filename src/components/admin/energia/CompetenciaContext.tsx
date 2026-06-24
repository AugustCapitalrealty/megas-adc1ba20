import { createContext, useContext, useState, ReactNode } from 'react';

interface CompetenciaContextValue {
  currentCompId: string | null;
  setCurrentCompId: (id: string | null) => void;
}

const CompetenciaContext = createContext<CompetenciaContextValue | null>(null);

export function CompetenciaProvider({ children }: { children: ReactNode }) {
  const [currentCompId, setCurrentCompId] = useState<string | null>(null);
  return (
    <CompetenciaContext.Provider value={{ currentCompId, setCurrentCompId }}>
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
  if (ctx) return ctx;
  return { currentCompId: local, setCurrentCompId: setLocal };
}