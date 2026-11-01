import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { TEMAS, TEMA_PADRAO, aplicarTema, lerTemaDev, resolverTema } from './themes';
import { ThemeContext } from './themeContext';
import { useAuth } from '../context/AuthContext';
import { carregarMarcaLembrada, lembrarMarca } from '../services/marca';

// O padrão é o VERTUMNO (a identidade da plataforma). Cada cliente tem a sua marca própria, que vem
// do backend: pelo endereço /c/<slug> (antes do login) e pela empresa do usuário (depois do login).
// VITE_DEFAULT_THEME só existe para instalações dedicadas a um único tema.
// A prévia ?tema=... continua disponível nos ambientes autorizados abaixo.
const TEMA_INICIAL = resolverTema(import.meta.env.VITE_DEFAULT_THEME || TEMA_PADRAO);

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

  // Sem prévia: a última marca usada neste navegador (ex.: equipe da Cherry abrindo /login direto);
  // sem nada lembrado, o padrão VERTUMNO.
  const lembrada = carregarMarcaLembrada();
  return resolverTema(temaDev || lembrada?.tema || TEMA_INICIAL);
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [temaBase, setTemaBase] = useState(temaInicial);
  const tema = user ? resolverTema(user.tema) : resolverTema(temaBase);

  // Tema de quem ainda não entrou (usado pelo endereço /c/<slug>).
  const definirTemaBase = useCallback(chave => setTemaBase(resolverTema(chave)), []);

  useLayoutEffect(() => {
    aplicarTema(document.documentElement, tema);
  }, [tema]);

  // Quem entrou deixa a marca da sua empresa lembrada neste navegador.
  useLayoutEffect(() => {
    if (!user) return;
    const tema = resolverTema(user.tema);
    const lembrada = carregarMarcaLembrada();
    // O endereço lembrado só vale se for da mesma marca de quem entrou.
    lembrarMarca({ tema, slug: lembrada?.tema === tema ? lembrada.slug : null });
  }, [user]);

  const value = useMemo(() => ({ tema, definirTemaBase, ...TEMAS[tema] }), [tema, definirTemaBase]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
