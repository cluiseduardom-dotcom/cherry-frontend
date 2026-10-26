import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  History,
  Settings,
  Tag,
  Users,
  UserCog,
  Wallet,
  HandCoins,
  Target,
  Receipt,
  Building2,
  ShoppingCart,
  BadgePercent,
  ArrowLeftRight,
  Briefcase,
  ClipboardCheck,
  LogOut,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../config/access';
import { rotuloDoUsuario } from '../config/papeis';
import './Mais.css';

const ITEMS = [
  { path: '/minha-maleta', label: 'Minha maleta', sub: 'Seu estoque, aceites e devoluções', icon: Briefcase },
  { path: '/transferencias', label: 'Transferências', sub: 'Mover estoque entre Central, maletas e consignados', icon: ArrowLeftRight },
  { path: '/acerto-estoque', label: 'Acerto de estoque', sub: 'Conferir contagem e fechar contas de cada local', icon: ClipboardCheck },
  { path: '/produtos', label: 'Produtos', sub: 'Gerenciar catálogo', icon: Tag },
  { path: '/clientes', label: 'Clientes', sub: 'Base de clientes', icon: Users },
  { path: '/fornecedores', label: 'Fornecedores', sub: 'Cadastro e relacionamento de compras', icon: Building2 },
  { path: '/compras', label: 'Compras', sub: 'Entradas, custos e fornecedores', icon: ShoppingCart },
  { path: '/historico', label: 'Histórico', sub: 'Consultar vendas', icon: History },
  { path: '/comissoes', label: 'Comissões', sub: 'Minhas comissões, equipe e repasses', icon: BadgePercent },
  { path: '/usuarios', label: 'Usuários', sub: 'Gerenciar equipe e acessos', icon: UserCog },
  { path: '/relatorios', label: 'Relatórios', sub: 'Análise de dados', icon: BarChart2 },
  { path: '/contas-pagar', label: 'Contas a Pagar', sub: 'Acompanhar compromissos', icon: Wallet },
  { path: '/contas-receber', label: 'Contas a Receber', sub: 'Acompanhar recebimentos', icon: HandCoins },
  { path: '/ponto-equilibrio', label: 'Ponto de Equilíbrio', sub: 'Analisar necessidade de faturamento', icon: Target },
  { path: '/despesas-fixas', label: 'Despesas Fixas', sub: 'Gerenciar custos recorrentes', icon: Receipt },
  { path: '/configuracoes', label: 'Configurações', sub: 'Preferências do sistema', icon: Settings },
];

export default function Mais() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = ITEMS.filter(item => canAccessRoute(item.path, user));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="page-content mais-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mais</h1>
          <p className="page-subtitle">Acesso rápido às áreas de gestão</p>
        </div>
        <Link to="/" className="btn btn-ghost">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <div className="mais-grid">
        {items.map(({ path, label, sub, icon: Icon }) => (
          <Link key={path} to={path} className="mais-card card card-padding">
            <span className="mais-card-icon"><Icon size={20} /></span>
            <span className="mais-card-content">
              <span className="mais-card-title">{label}</span>
              <span className="mais-card-sub">{sub}</span>
            </span>
            <ArrowRight size={17} className="mais-card-arrow" />
          </Link>
        ))}
      </div>

      {/* No celular o menu lateral não existe: é aqui que o usuário sai da conta. */}
      <div className="mais-conta card card-padding">
        <div className="mais-conta-info">
          <span className="mais-conta-nome">{user?.nome}</span>
          <span className="mais-conta-papel">{rotuloDoUsuario(user)}</span>
        </div>
        <button type="button" className="btn btn-ghost mais-conta-sair" onClick={handleLogout}>
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}
