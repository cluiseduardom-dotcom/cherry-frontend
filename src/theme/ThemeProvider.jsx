import { useLayoutEffect, useMemo, useState } from 'react';
import { TEMAS, TEMA_PADRAO, aplicarTema, lerTemaDev, resolverTema } from './themes';
import { ThemeContext } from './themeContext';
import { useAuth } from '../context/AuthContext';

// Esta implantação serve a Cherry; preserve esse padrão no deploy atual.
// Instalações dedicadas ao VERTUMNO definem VITE_DEFAULT_THEME=vertumno.
// A prévia ?tema=vertumno continua disponível nos ambientes autorizados abaixo.
const TEMA_INICIAL = resolverTema(import.meta.env.VITE_DEFAULT_THEME || 'cherry');

function temaInicial() {
  if (typeof window === 'undefined') return TEMA_INICIAL;

  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }

  // Em desenvolvimento local ou ambientes de validação/preview (ex.: PR preview no Render),
  // permite alternar o tema explicitamente via ?tema=cherry | ?tema=vertumno
  const podePrevisualizar = Boolean(
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_THEME_DEV === 'true' ||
    (typeof window !== 'undefined' && (
      window.location.hostname.includes('localhost') ||
      window.location.hostname.includes('127.0.0.1') ||
      window.location.hostname.includes('onrender.com')
    ))
  );

  const temaDev = lerTemaDev({
    search: window.location.search,
    storage,
    isDev: podePrevisualizar,
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
