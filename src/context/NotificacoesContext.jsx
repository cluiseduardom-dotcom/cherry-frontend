import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { listarNotificacoes } from '../services/notificacoes';
import {
  chaveDeLidos, lerLidos, salvarLidos, podarLidos, contarNaoLidos, marcarLido, marcarTodosLidos,
} from '../utils/notificacoes';

const NotificacoesContext = createContext(null);

const INTERVALO_MS = 5 * 60 * 1000;

function storageSeguro() {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
}

// O provider é remontado por usuário (key no Layout): os "lidos" de uma conta nunca vazam para outra.
export function NotificacoesProvider({ children }) {
  const { user } = useAuth();
  const chave = chaveDeLidos(user);
  const [itens, setItens] = useState([]);
  const [lidos, setLidos] = useState(() => lerLidos(storageSeguro(), chave));
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const chaveRef = useRef(chave);

  useEffect(() => {
    chaveRef.current = chave;
  }, [chave]);

  const recarregar = useCallback(async () => {
    try {
      const dados = await listarNotificacoes();
      const lista = Array.isArray(dados?.itens) ? dados.itens : [];
      setItens(lista);
      setErro('');
      setLidos((atual) => {
        const podados = podarLidos(atual, lista);
        if (podados.length !== atual.length) salvarLidos(storageSeguro(), chaveRef.current, podados);
        return podados;
      });
    } catch (e) {
      setErro(e?.message || 'Não foi possível carregar os avisos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
    const timer = setInterval(recarregar, INTERVALO_MS);
    const aoVoltar = () => { if (document.visibilityState === 'visible') recarregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [recarregar]);

  const marcarComoLido = useCallback((id) => {
    setLidos((atual) => {
      const novo = marcarLido(atual, id);
      salvarLidos(storageSeguro(), chaveRef.current, novo);
      return novo;
    });
  }, []);

  const marcarTodosComoLidos = useCallback(() => {
    setLidos((atual) => {
      const novo = marcarTodosLidos(atual, itens);
      salvarLidos(storageSeguro(), chaveRef.current, novo);
      return novo;
    });
  }, [itens]);

  const value = useMemo(() => ({
    itens,
    lidos,
    naoLidos: contarNaoLidos(itens, lidos),
    carregando,
    erro,
    recarregar,
    marcarComoLido,
    marcarTodosComoLidos,
  }), [itens, lidos, carregando, erro, recarregar, marcarComoLido, marcarTodosComoLidos]);

  return <NotificacoesContext.Provider value={value}>{children}</NotificacoesContext.Provider>;
}

export function useNotificacoes() {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) throw new Error('useNotificacoes deve ser usado dentro de um NotificacoesProvider');
  return ctx;
}
