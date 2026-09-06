'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface PageMeta {
  /** Título de la página; lo muestra la barra superior en móvil. */
  title: string;
  /** Ruta padre: si existe, la barra superior muestra la flecha atrás. */
  backHref?: string;
}

interface ShellContextValue {
  pageMeta: PageMeta | null;
  setPageMeta: (meta: PageMeta | null) => void;
}

const ShellContext = createContext<ShellContextValue>({
  pageMeta: null,
  setPageMeta: () => {},
});

export function ShellMetaProvider({ children }: { children: React.ReactNode }) {
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const value = useMemo(() => ({ pageMeta, setPageMeta }), [pageMeta]);

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShellMeta() {
  return useContext(ShellContext);
}

/** Registra el título y la ruta padre de la página actual en el shell. */
export function useRegisterPageMeta(title: string, backHref?: string) {
  const { setPageMeta } = useShellMeta();

  useEffect(() => {
    setPageMeta({ title, backHref });
    return () => setPageMeta(null);
  }, [setPageMeta, title, backHref]);
}
