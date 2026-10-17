import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/themeContext';
import { homeRouteForRole } from '../config/access';
import './Login.css';

function CherrySymbol({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 160 150" role="img" aria-label="Cerejas douradas">
      <defs>
        <linearGradient id="cherry-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F9D889" />
          <stop offset="52%" stopColor="#D19A3E" />
          <stop offset="100%" stopColor="#F3C765" />
        </linearGradient>
        <linearGradient id="cherry-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE7A1" />
          <stop offset="100%" stopColor="#C58A32" />
        </linearGradient>
      </defs>
      <g stroke="url(#cherry-gold)" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M72 69 C75 47 80 29 94 17 C100 12 107 15 103 21 C99 27 91 25 91 19" />
        <path d="M72 69 C62 79 54 91 49 104" />
        <path d="M74 68 C91 76 105 88 111 104" />
        <path d="M72 69 C74 87 77 96 82 105" />
        <path d="M50 104 C38 91 20 96 17 111 C14 125 26 138 41 134 C52 131 58 117 50 104 Z" />
        <path d="M82 105 C69 94 52 101 52 117 C52 132 67 143 81 136 C93 130 94 115 82 105 Z" />
        <path d="M96 30 C113 27 130 36 141 52 C123 52 108 45 96 30 Z" fill="url(#cherry-leaf)" strokeWidth="1.9" />
        <path d="M101 33 C113 40 124 47 137 50" stroke="#A96F28" strokeWidth="1.2" />
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
