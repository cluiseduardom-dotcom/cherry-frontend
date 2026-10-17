import { useLayoutEffect, useMemo, useState } from 'react';
import { TEMAS, TEMA_PADRAO, aplicarTema, lerTemaDev, resolverTema } from './themes';
import { ThemeContext } from './themeContext';
import { useAuth } from '../context/AuthContext';

// A identidade antes do login é definida pela implantação (Cherry ou VERTUMNO).
// Para este frontend da Cherry, Cherry é o padrão; outra implantação pode definir
// VITE_DEFAULT_THEME=vertumno. A sessão autenticada sempre prevalece.
const TEMA_INICIAL = resolverTema(import.meta.env.VITE_DEFAULT_THEME || 'cherry');

function temaInicial() {
  if (typeof window === 'undefined') return TEMA_INICIAL;

  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }

  const temaDev = lerTemaDev({
    search: window.location.search,
    storage,
    isDev: import.meta.env.DEV,
  });

  return resolverTema(temaDev || TEMA_INICIAL);
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [temaBase] = useState(temaInicial);
  const tema = user ? resolverTema(user.tema) : resolverTema(temaBase);

  useLayoutEffect(() => {
    aplicarTema(document.documentElement, tema);
  }, [tema]);

  const value = useMemo(() => ({ tema, ...TEMAS[tema] }), [tema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
