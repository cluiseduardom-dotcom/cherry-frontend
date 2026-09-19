import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Lock, User, Palette, Globe, ChevronRight, FolderTree } from 'lucide-react';
import './Configuracoes.css';

const sections = [
  {
    title: 'Catálogo',
    icon: FolderTree,
    items: [
      { label: 'Categorias de produto', sub: 'Níveis, códigos e SKU automático', path: '/configuracoes/categorias' },
    ],
  },
  {
    title: 'Conta',
    icon: User,
    items: [
      { label: 'Perfil de usuário',     sub: 'Nome, foto e cargo' },
      { label: 'Segurança',             sub: 'Senha e autenticação' },
    ],
  },
  {
    title: 'Aparência',
    icon: Palette,
    items: [
      { label: 'Tema',                  sub: 'Claro, escuro ou automático' },
      { label: 'Idioma e região',       sub: 'Português (Brasil)' },
    ],
  },
  {
    title: 'Notificações',
    icon: Bell,
    items: [
      { label: 'Alertas de estoque',    sub: 'Notificações de estoque baixo' },
      { label: 'Resumo diário',         sub: 'Relatório por e-mail às 20h' },
    ],
  },
  {
    title: 'Empresa',
    icon: Globe,
    items: [
      { label: 'Dados da empresa',      sub: 'CNPJ, endereço e contato' },
      { label: 'Plano e assinatura',    sub: 'Informações de assinatura ainda não configuradas' },
    ],
  },
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const nomeUsuario = user?.nome || 'Usuário';
  const emailUsuario = user?.email || '—';
  const roleLabels = { admin: 'Administrador(a)', vendedor: 'Vendedor(a)', estoquista: 'Estoquista' };
  const roleLabel = roleLabels[user?.role] || 'Usuário';
  const iniciais = nomeUsuario.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Gerencie sua conta e preferências</p>
        </div>
      </div>

      <div className="configuracoes-layout">
        <div className="configuracoes-sections">
          {sections.map(({ title, icon: Icon, items }) => (
            <div key={title} className="card">
              <div className="config-section-header">
                <div className="config-section-icon">
                  <Icon size={16} />
                </div>
                <span className="config-section-title">{title}</span>
              </div>
              <div className="config-items">
                {items.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className="config-item"
                    onClick={item.path ? () => navigate(item.path) : undefined}
                    disabled={!item.path}
                    aria-disabled={!item.path}
                  >
                    <div className="config-item-info">
                      <div className="config-item-label">{item.label}</div>
                      <div className="config-item-sub">
                        {item.sub}
                        {!item.path && <span className="config-item-soon">Em breve</span>}
                      </div>
                    </div>
                    {item.path && <ChevronRight size={16} className="config-item-arrow" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Profile card */}
        <div className="configuracoes-profile">
          <div className="card card-padding profile-card">
            <div className="profile-card-avatar">{iniciais}</div>
            <div className="profile-card-name">{nomeUsuario}</div>
            <div className="profile-card-role"><span className={`role-badge role-badge--${user?.role || "admin"}`}>{roleLabel}</span></div>
            <div className="profile-card-email">{emailUsuario}</div>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              style={{ marginTop: 'var(--space-4)' }}
              disabled
            >
              <User size={15} />
              Editar perfil
            </button>
          </div>

          <div className="card card-padding plan-card">
            <div className="plan-card-header">
              <span className="plan-badge badge badge-primary">PRO</span>
              <span className="plan-card-title">Plano ativo</span>
            </div>
            <div className="plan-card-desc">
              Informações de plano e assinatura ainda não estão disponíveis neste ambiente.
            </div>
            <div className="plan-card-expiry">
              <span className="text-secondary">Sem data de renovação configurada.</span>
            </div>
            <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }} disabled>
              Gerenciar plano
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
