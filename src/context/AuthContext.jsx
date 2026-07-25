import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { setAuthBridge } from '../services/api';
import { loginRequest } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tokenRef = useRef(null);
  tokenRef.current = token;

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    setAuthBridge({
      getToken: () => tokenRef.current,
      onUnauthorized: logout,
    });
  }, [logout]);

  async function login(email, senha) {
    setLoading(true);
    setError('');
    try {
      const result = await loginRequest(email, senha);
      setToken(result.token);
      setUser(result.user);
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
