import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/themeContext';
import { homeRouteForRole } from '../config/access';
import './Login.css';



function CherrySymbol({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 180 160" role="img" aria-label="Cerejas douradas" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cherryGold" x1="35" y1="18" x2="130" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE8A0" />
          <stop offset=".52" stopColor="#D6A13F" />
          <stop offset="1" stopColor="#F5D477" />
        </linearGradient>
        <linearGradient id="cherryLeaf" x1="95" y1="35" x2="145" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8E1A0" />
          <stop offset="1" stopColor="#C99136" />
        </linearGradient>
      </defs>
      <g stroke="url(#cherryGold)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M73 80 C75 58 81 36 96 18 C101 12 110 13 108 19 C106 25 97 27 94 20" />
        <path d="M73 80 C60 88 49 101 43 119" />
        <path d="M75 79 C90 86 101 101 108 119" />
        <path d="M74 79 C75 94 77 107 83 120" />
        <path d="M44 119 C31 105 13 111 12 128 C11 144 28 153 42 145 C53 139 54 126 44 119Z" />
        <path d="M83 120 C69 107 51 115 52 132 C53 148 71 157 85 148 C97 140 96 127 83 120Z" />
        <path d="M99 29 C116 27 136 39 151 59 C130 58 111 47 99 29Z" fill="url(#cherryLeaf)" strokeWidth="2" />
        <path d="M105 33 C118 43 131 51 145 56" stroke="#B47A2A" strokeWidth="1.3" />
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
    <>
      {isCherry && (
        <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <filter id="cherry-transparent-background" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0.5 1.5 1.2 0 -0.32
              " />
            </filter>
          </defs>
        </svg>
      )}
    <div className={`login-page ${isCherry ? 'login-page-cherry' : ''}`}>
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-blob login-bg-blob--1" />
        <div className="login-bg-blob login-bg-blob--2" />
        <div className="login-bg-blob login-bg-blob--3" />
      </div>

      <div className="login-card card">
        <div className={`login-logo ${isCherry ? 'login-logo-cherry' : ''}`}>
          {isCherry ? (
            <div className="cherry-brand-lockup" aria-label="Cherry Semijoias"><CherrySymbol className="cherry-wordmark-symbol" /><span className="cherry-wordmark-name">Cherry</span><span className="cherry-wordmark-subtitle">SEMIJOIAS</span></div>
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
    </>
  );
}
