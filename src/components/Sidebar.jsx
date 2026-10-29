import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Users,
  UserCog,
  History,
  BarChart2,
  Settings,
  Cherry,
  LogOut,
  Wallet,
  HandCoins,
  Target,
  Receipt,
  Building2,
  AlertTriangle,
  PackageX,
  BadgePercent,
  ArrowLeftRight,
  Briefcase,
  ClipboardCheck,
  PackageMinus,
  ChevronDown,
  Store,
  Boxes,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/themeContext';
import { ALLOWED_ROLES_BY_PATH, canAccessRoute } from '../config/access';
import { rotuloDoUsuario } from '../config/papeis';
import { EVENTO_ESTOQUE_ALTERADO, listarEstoqueBaixo } from '../services/estoque';
import { montarMenu, grupoContemRota, lerGruposAbertos, salvarGruposAbertos } from '../utils/menuGrupos';
import Avatar from './Avatar';
import './Sidebar.css';

// Metadados de apresentação por rota — access.js decide quem pode ver
// cada path; aqui só decidimos como mostrar as rotas que o papel pode ver.
const NAV_META_BY_PATH = {
  '/':                 { icon: LayoutDashboard, label: 'Dashboard' },
  '/venda':            { icon: ShoppingCart,    label: 'Venda' },
  '/estoque':          { icon: Package,         label: 'Estoque' },
  '/transferencias':   { icon: ArrowLeftRight, label: 'Transferências' },
  '/acerto-estoque':   { icon: ClipboardCheck, label: 'Acerto de estoque' },
  '/consumo':          { icon: PackageMinus,   label: 'Consumo de insumos' },
  '/minha-maleta':     { icon: Briefcase,       label: 'Minha maleta' },
  '/produtos':         { icon: Tag,             label: 'Produtos' },
  '/clientes':         { icon: Users,           label: 'Clientes' },
  '/fornecedores':     { icon: Building2,       label: 'Fornecedores' },
  '/compras':          { icon: ShoppingCart,    label: 'Compras' },
  '/historico':        { icon: History,         label: 'Histórico' },
  '/comissoes':        { icon: BadgePercent,    label: 'Comissões' },
  '/usuarios':         { icon: UserCog,         label: 'Usuários' },
  '/relatorios':       { icon: BarChart2,       label: 'Relatórios' },
  '/contas-pagar':     { icon: Wallet,          label: 'Contas a Pagar' },
  '/contas-receber':   { icon: HandCoins,       label: 'Contas a Receber' },
  '/ponto-equilibrio': { icon: Target,          label: 'Ponto de Equilíbrio' },
  '/despesas-fixas':   { icon: Receipt,         label: 'Despesas Fixas' },
  '/configuracoes':    { icon: Settings,        label: 'Configurações' },
};

// Rotas com segmento dinâmico (ex: /produtos/:id/precos) não têm entrada em
// NAV_META_BY_PATH nem fazem sentido como item de menu fixo — são acessadas
// a partir de outra tela (ex: um ícone na lista de Produtos), não pela
// sidebar. /compras/recebimentos é acessada pela aba "Recebimentos" dentro
// do Hub de Compras — não deve virar item próprio de menu (o brief pede
// explicitamente para não criar menus principais separados para
// Recebimentos).
const ROTAS_SEM_ITEM_PROPRIO = ['/mais', '/compras/recebimentos', '/conta/seguranca', '/conta/perfil', '/plataforma/taxas'];

// UX-04 (Issue #48): /produtos/estoque-baixo já retorna todo produto com
// estoque_atual <= estoque_minimo — o mesmo conjunto que Estoque.jsx usa
// para lowStockCount/outCount. Aqui replicamos a mesma regra (não criamos
// endpoint novo nem mudamos o que conta como "baixo"/"esgotado") só para
// decompor a contagem única em dois alertas semanticamente distintos.
export function contarAlertasEstoque(alertas) {
  const lista = Array.isArray(alertas) ? alertas : [];
  return {
    baixo: lista.filter(a => Number(a.estoque_atual) > 0).length,
    esgotado: lista.filter(a => Number(a.estoque_atual) === 0).length,
  };
}

const rotasDoMenu = Object.keys(ALLOWED_ROLES_BY_PATH)
  .filter(path => !path.includes(':') && !ROTAS_SEM_ITEM_PROPRIO.includes(path));

// Ícones dos grupos (a estrutura e as regras ficam em utils/menuGrupos.js).
const ICONES_GRUPO = {
  vendas: Store,
  estoque: Boxes,
  compras: ShoppingCart,
  financeiro: Landmark,
  administracao: ShieldCheck,
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { marca } = useTheme();
  const [estoqueAlertas, setEstoqueAlertas] = useState([]);
  const [gruposAbertos, setGruposAbertos] = useState(() => lerGruposAbertos());

  // O aviso é recarregado ao trocar de tela, ao voltar para a aba e quando uma movimentação de
  // estoque é registrada (evento). Antes só carregava no login e ficava desatualizado.
  const rotaAtual = location.pathname;

  useEffect(() => {
    if (!canAccessRoute('/estoque', user)) {
      setEstoqueAlertas([]);
      return undefined;
    }

    let cancelled = false;

    function carregar() {
      listarEstoqueBaixo()
        .then(alertas => {
          if (!cancelled) setEstoqueAlertas(Array.isArray(alertas) ? alertas : []);
        })
        .catch(() => {
          if (!cancelled) setEstoqueAlertas([]);
        });
    }

    function aoVoltarParaAba() {
      if (document.visibilityState === 'visible') carregar();
    }

    carregar();
    window.addEventListener(EVENTO_ESTOQUE_ALTERADO, carregar);
    document.addEventListener('visibilitychange', aoVoltarParaAba);

    return () => {
      cancelled = true;
      window.removeEventListener(EVENTO_ESTOQUE_ALTERADO, carregar);
      document.removeEventListener('visibilitychange', aoVoltarParaAba);
    };
  }, [user, rotaAtual]);

  const alertasEstoque = contarAlertasEstoque(estoqueAlertas);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const menu = montarMenu(rotasDoMenu, path => canAccessRoute(path, user));

  // Ao entrar numa rota de um grupo fechado (link de outra tela, voltar do navegador), ele abre.
  useEffect(() => {
    const grupoAtual = menu.find(e => e.tipo === 'grupo' && grupoContemRota(e.itens, rotaAtual));
    if (grupoAtual) {
      setGruposAbertos(prev => (prev[grupoAtual.id] ? prev : { ...prev, [grupoAtual.id]: true }));
    }
    // menu muda só com o usuário; a rota é o gatilho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotaAtual, user]);

  function alternarGrupo(id) {
    setGruposAbertos(prev => {
      const proximo = { ...prev, [id]: !prev[id] };
      salvarGruposAbertos(proximo);
      return proximo;
    });
  }

  function renderItem(path, { filho = false } = {}) {
    const meta = NAV_META_BY_PATH[path];
    if (!meta) return null;
    const { icon: Icon, label } = meta;
    return (
      <div key={path}>
        <NavLink
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `sidebar-nav-item ${filho ? 'sidebar-nav-item--filho' : ''} ${isActive ? 'sidebar-nav-item--active' : ''}`
          }
        >
          <span className="sidebar-nav-icon">
            <Icon size={filho ? 16 : 18} strokeWidth={2} />
          </span>
          <span className="sidebar-nav-label-text">{label}</span>
        </NavLink>
        {path === '/estoque' && renderAlertasEstoque()}
      </div>
    );
  }

  // UX-04 (Issue #48): dois alertas independentes — cada um com sua própria contagem, ícone, texto e
  // deeplink para o filtro correspondente em Estoque. Um tipo não esconde o outro; só não renderiza
  // quando a contagem daquele tipo é zero. Nunca dependem só de cor: sempre têm texto + ícone.
  function renderAlertasEstoque() {
    if (alertasEstoque.baixo === 0 && alertasEstoque.esgotado === 0) return null;
    return (
      <div className="sidebar-stock-alerts">
        {alertasEstoque.baixo > 0 && (
          <Link
            to="/estoque?filtro=baixo"
            className="sidebar-stock-alert sidebar-stock-alert--baixo"
            aria-label={`${alertasEstoque.baixo} ${alertasEstoque.baixo === 1 ? 'produto com' : 'produtos com'} estoque baixo. Ver lista filtrada em Estoque.`}
            title={`${alertasEstoque.baixo} ${alertasEstoque.baixo === 1 ? 'produto com' : 'produtos com'} estoque baixo`}
          >
            <AlertTriangle size={14} strokeWidth={2} />
            <span>Estoque baixo: {alertasEstoque.baixo}</span>
          </Link>
        )}
        {alertasEstoque.esgotado > 0 && (
          <Link
            to="/estoque?filtro=esgotado"
            className="sidebar-stock-alert sidebar-stock-alert--esgotado"
            aria-label={`${alertasEstoque.esgotado} ${alertasEstoque.esgotado === 1 ? 'produto esgotado' : 'produtos esgotados'}. Ver lista filtrada em Estoque.`}
            title={`${alertasEstoque.esgotado} ${alertasEstoque.esgotado === 1 ? 'produto esgotado' : 'produtos esgotados'}`}
          >
            <PackageX size={14} strokeWidth={2} />
            <span>Esgotados: {alertasEstoque.esgotado}</span>
          </Link>
        )}
      </div>
    );
  }

  function renderGrupo(grupo) {
    const Icon = ICONES_GRUPO[grupo.id];
    const aberto = Boolean(gruposAbertos[grupo.id]);
    const ativo = grupoContemRota(grupo.itens, rotaAtual);
    const totalAlertas = grupo.id === 'estoque' ? alertasEstoque.baixo + alertasEstoque.esgotado : 0;
    const idLista = `sidebar-grupo-${grupo.id}`;
    return (
      <div key={grupo.id} className="sidebar-grupo">
        <button
          type="button"
          className={`sidebar-nav-item sidebar-grupo-btn ${ativo && !aberto ? 'sidebar-grupo-btn--ativo' : ''}`}
          aria-expanded={aberto}
          aria-controls={idLista}
          onClick={() => alternarGrupo(grupo.id)}
        >
          <span className="sidebar-nav-icon">
            <Icon size={18} strokeWidth={2} />
          </span>
          <span className="sidebar-nav-label-text">{grupo.label}</span>
          {!aberto && totalAlertas > 0 && (
            <span
              className="sidebar-grupo-badge"
              aria-label={`${totalAlertas} ${totalAlertas === 1 ? 'alerta' : 'alertas'} de estoque`}
              title={`${totalAlertas} ${totalAlertas === 1 ? 'alerta' : 'alertas'} de estoque`}
            >
              {totalAlertas}
            </span>
          )}
          <ChevronDown
            size={16}
            strokeWidth={2}
            className={`sidebar-grupo-chevron ${aberto ? 'sidebar-grupo-chevron--aberto' : ''}`}
            aria-hidden="true"
          />
        </button>
        {aberto && (
          <div id={idLista} className="sidebar-grupo-lista">
            {grupo.itens.map(path => renderItem(path, { filho: true }))}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      {marca.logo ? (
        <div className="sidebar-logo sidebar-logo--imagem">
          <img className="sidebar-logo-img" src={marca.logo} alt={marca.logoAlt || marca.nome} />
        </div>
      ) : (
        <div className="sidebar-logo">
          {marca.mostrarIcone && (
            <div className="sidebar-logo-icon">
              <Cherry size={22} strokeWidth={2.2} />
            </div>
          )}
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-brand">{marca.nome}</span>
            {marca.subtitulo && <span className="sidebar-logo-sub">{marca.subtitulo}</span>}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menu.map(entrada => (entrada.tipo === 'grupo' ? renderGrupo(entrada) : renderItem(entrada.path)))}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <Link to="/conta/perfil" className="sidebar-user-avatar-link" aria-label="Minha foto de perfil" title="Minha foto de perfil">
          <Avatar nome={user?.nome} fotoUrl={user?.foto_url} className="sidebar-user-avatar" />
        </Link>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.nome}</span>
          <span className={`role-badge role-badge--${user?.role}`}>{rotuloDoUsuario(user)}</span>
        </div>
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={handleLogout}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}
