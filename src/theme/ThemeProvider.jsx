import { useLayoutEffect, useMemo, useState } from 'react';
import { TEMAS, TEMA_PADRAO, aplicarTema, lerTemaDev, resolverTema } from './themes';
import { ThemeContext } from './themeContext';

function temaInicial() {
  if (typeof window === 'undefined') return TEMA_PADRAO;

  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }

  return resolverTema(
    lerTemaDev({ search: window.location.search, storage, isDev: import.meta.env.DEV }),
  );
}

export function ThemeProvider({ children }) {
  const [tema] = useState(temaInicial);

  useLayoutEffect(() => {
    aplicarTema(document.documentElement, tema);
  }, [tema]);

  const value = useMemo(() => ({ tema, ...TEMAS[tema] }), [tema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
