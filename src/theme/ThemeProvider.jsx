import { useLayoutEffect, useMemo, useState } from 'react';
import { TEMAS, TEMA_PADRAO, aplicarTema, lerTemaDev, resolverTema } from './themes';
import { ThemeContext } from './themeContext';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const [temaDev] = useState(temaInicial);

  // O tema da empresa autenticada tem precedência. Antes do login,
  // mantém VERTUMNO; a pré-visualização continua disponível apenas em dev.
  const tema = user ? resolverTema(user.tema) : resolverTema(temaDev);

  useLayoutEffect(() => {
    aplicarTema(document.documentElement, tema);
  }, [tema]);

  const value = useMemo(() => ({ tema, ...TEMAS[tema] }), [tema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
