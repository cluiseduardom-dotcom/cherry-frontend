import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/themeContext';
import { homeRouteForRole } from '../config/access';
import './Login.css';

function CherrySymbol({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Cereja dourada">
      <defs>
        <linearGradient id="cherry-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F8D88A" />
          <stop offset="48%" stopColor="#C58B35" />
          <stop offset="100%" stopColor="#FFE8A8" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#cherry-gold)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M59 49 C58 32 60 17 73 9 C81 4 86 12 78 17 C70 21 62 19 59 13" />
        <path d="M60 48 C47 52 36 63 29 78" />
        <path d="M61 47 C76 52 85 63 91 76" />
        <path d="M29 78 C16 72 8 83 12 96 C17 110 34 112 43 101 C49 94 45 83 37 79 C34 78 31 78 29 78 Z" />
        <path d="M77 78 C64 72 56 83 60 96 C65 110 82 112 91 101 C97 94 93 83 85 79 C82 78 79 78 77 78 Z" />
        <path d="M64 24 C77 23 91 29 100 43 C89 45 76 41 68 32 Z" fill="url(#cherry-gold)" strokeWidth="2.2" />
        <path d="M71 29 C78 34 85 38 94 41" stroke="#8C5B23" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const { marca } = useTheme();
  const isCherry = marca.nome === 'Cherry';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    const from = location.state?.from?.pathname;
    return <Navigate to={from || homeRouteForRole(user.role)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      const from = location.state?.from?.pathname;
      navigate(from || homeRouteForRole(loggedUser.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`login-page ${isCherry ? 'login-page-cherry' : ''}`}>
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-blob login-bg-blob--1" />
        <div className="login-bg-blob login-bg-blob--2" />
        <div className="login-bg-blob login-bg-blob--3" />
      </div>

      <div className="login-card card">
        <div className={`login-logo ${isCherry ? 'login-logo-cherry' : ''}`}>
          {isCherry ? (
            <div className="cherry-wordmark" aria-label="Cherry Semijoias">
              <CherrySymbol className="cherry-wordmark-symbol" />
              <span className="cherry-wordmark-name">Cherry</span>
              <span className="cherry-wordmark-subtitle">SEMIJOIAS</span>
            </div>
          ) : (
            <img className="login-brand-logo" src={marca.logo} alt={marca.logoAlt} />
          )}
        </div>

        <div className="login-header">
          <h1 className="login-title">Bem-vinda de volta</h1>
          <p className="login-subtitle">Entre na sua conta para continuar</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="login-error">
              <Lock size={14} />
              {error}
            </div>
          )}

          <div className="input-wrapper">
            <label className="input-label" htmlFor="login-email">E-mail</label>
            <div className="input-icon-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="input-wrapper">
            <div className="login-pass-label">
              <label className="input-label" htmlFor="login-password">Senha</label>
              <button type="button" className="login-forgot">Esqueceu a senha?</button>
            </div>
            <div className="input-icon-wrapper login-pass-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="input-field login-pass-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary btn-full btn-lg login-submit"
            disabled={loading}
          >
            {loading ? <span className="login-spinner" /> : <>Entrar <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>

      <div className="login-side">
        <div className="login-side-content">
          {isCherry ? (
            <CherrySymbol className="login-side-brand-symbol" />
          ) : marca.simbolo ? (
            <img className="login-side-brand-symbol" src={marca.simbolo} alt="" aria-hidden="true" />
          ) : null}
          <h2 className="login-side-title">{marca.loginTitulo}</h2>
          <p className="login-side-desc">{marca.loginDescricao}</p>
          <div className="login-side-features">
            {['Vendas em tempo real', 'Controle de estoque', 'Gestão de clientes', 'Relatórios detalhados'].map(f => (
              <div key={f} className="login-side-feature">
                <div className="login-side-feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
