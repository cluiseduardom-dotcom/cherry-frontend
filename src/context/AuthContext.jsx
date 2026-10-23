import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { setAuthBridge } from '../services/api';
import { buscarMe, formatarUsuario, loginRequest } from '../services/auth';
import { carregarSessao, limparSessao, salvarSessao } from '../services/authSession';
import { podeComCapacidade } from '../config/access';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tokenRef = useRef(null);
  tokenRef.current = token;

  const logout = useCallback(() => {
    limparSessao();
    setUser(null);
    setToken(null);
  }, []);

  const temCapacidade = useCallback(
    (nome) => podeComCapacidade(user, nome),
    [user]
  );

  useEffect(() => {
    setAuthBridge({
      getToken: () => tokenRef.current,
      onUnauthorized: logout,
    });
  }, [logout]);

  useEffect(() => {
    let cancelado = false;

    async function restaurar() {
      const sessao = carregarSessao();
      if (!sessao?.token) {
        setLoading(false);
        return;
      }

      setToken(sessao.token);
      setUser(sessao.user);

      try {
        const me = await buscarMe(sessao.token);
        if (!cancelado && me) {
          const updatedUser = formatarUsuario(me, sessao.user);
          setUser(updatedUser);
          salvarSessao({ token: sessao.token, user: updatedUser });
        }
      } catch (err) {
        if (err?.status === 401) {
          logout();
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    }

    restaurar();

    return () => {
      cancelado = true;
    };
  }, [logout]);

  async function login(email, senha) {
    setLoading(true);
    setError('');
    try {
      const result = await loginRequest(email, senha);
      setToken(result.token);
      setUser(result.user);
      salvarSessao({ token: result.token, user: result.user });
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    error,
    login,
    logout,
    temCapacidade,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return ctx;
}
