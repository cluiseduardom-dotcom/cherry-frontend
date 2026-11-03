import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/themeContext';
import { homeRouteForRole } from '../config/access';
import { carregarMarcaLembrada } from '../services/marca';
import { ehEmail } from '../utils/loginUsuario';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const { marca, tema } = useTheme();
  const isCherry = tema === 'cherry';
  const { slug: slugDaUrl } = useParams();
  // Loja do código de usuário: a da página /c/<slug>, ou a última usada neste navegador.
  const slugLoja = slugDaUrl || carregarMarcaLembrada()?.slug || null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ajudaSenha, setAjudaSenha] = useState(false);

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
    if (!ehEmail(email) && !slugLoja) {
      setError('Para entrar com o usuário, use o endereço da sua loja (ex.: app.vertumno.com.br/c/sualoja) ou entre com o e-mail.');
      return;
    }
    setLoading(true);
    try {
      const loggedUser = await login(email, password, ehEmail(email) ? undefined : slugLoja);
      const from = location.state?.from?.pathname;
      navigate(from || homeRouteForRole(loggedUser.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`login-page ${isCherry ? 'login-page-cherry' : `login-page-vertumno login-page-tema-${tema}`}`}>
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-blob login-bg-blob--1" />
        <div className="login-bg-blob login-bg-blob--2" />
        <div className="login-bg-blob login-bg-blob--3" />
      </div>

      <div className="login-card card">
        <div className="login-logo">
          {marca.logo ? (
            <img
              className="login-brand-logo"
              src={marca.logo}
              alt={marca.logoAlt || marca.nome}
            />
          ) : (
            <div className="login-logo-text">
              <span className="login-brand">{marca.nome}</span>
              {marca.subtitulo && <span className="login-sub">{marca.subtitulo}</span>}
            </div>
          )}
          {marca.tagline && (
            <span className="login-brand-tagline">{marca.tagline}</span>
          )}
        </div>

        <div className="login-header">
          <h1 className="login-title">{isCherry ? 'Bem-vinda de volta' : 'Bem-vindo de volta'}</h1>
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
            <label className="input-label" htmlFor="login-email">Usuário ou e-mail</label>
            <div className="input-icon-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="login-email"
                type="text"
                className="input-field"
                placeholder="Ex.: EGASIL ou seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="input-wrapper">
            <div className="login-pass-label">
              <label className="input-label" htmlFor="login-password">Senha</label>
              <button type="button" className="login-forgot" aria-expanded={ajudaSenha} onClick={() => setAjudaSenha(v => !v)}>Esqueceu a senha?</button>
            </div>
            {ajudaSenha && (
              <p className="login-ajuda-senha" role="status">Peça ao administrador da loja para redefinir a sua senha (Usuários → Redefinir senha).</p>
            )}
            <div className="input-icon-wrapper login-pass-wrapper">
              <Lock size={18} className="input-icon" />
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
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
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
          <img
            className="login-side-brand-symbol"
            src={isCherry ? marca.logo : (marca.simbolo || marca.logo)}
            alt=""
            aria-hidden="true"
          />
          <h2 className="login-side-title">{marca.loginTitulo}</h2>
          {marca.tagline && (
            <p className="login-side-tagline">{marca.tagline}</p>
          )}
          <p className="login-side-desc">{marca.loginDescricao}</p>
          <div className="login-side-features">
            {['Vendas em tempo real', 'Controle de estoque', 'Gestão de clientes', 'Relatórios detalhados'].map(f => (
              <div key={f} className="login-side-feature">
                <div className="login-side-feature-dot">
                  {!isCherry && <Check size={11} strokeWidth={3.5} className="login-side-feature-check" />}
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
