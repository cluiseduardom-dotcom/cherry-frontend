import { Bell, Lock, User, Palette, Globe, ChevronRight } from 'lucide-react';
import './Configuracoes.css';

const sections = [
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
      { label: 'Plano e assinatura',    sub: 'Pro — vence em 15/01/2027' },
    ],
  },
];

export default function Configuracoes() {
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
                  <button key={i} className="config-item">
                    <div className="config-item-info">
                      <div className="config-item-label">{item.label}</div>
                      <div className="config-item-sub">{item.sub}</div>
                    </div>
                    <ChevronRight size={16} className="config-item-arrow" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Profile card */}
        <div className="configuracoes-profile">
          <div className="card card-padding profile-card">
            <div className="profile-card-avatar">MS</div>
            <div className="profile-card-name">Maria Silva</div>
            <div className="profile-card-role"><span className="role-badge role-badge--admin">Administradora</span></div>
            <div className="profile-card-email">maria.silva@cherry.com.br</div>
            <button className="btn btn-secondary btn-full" style={{ marginTop: 'var(--space-4)' }}>
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
              Acesso completo a todos os módulos do sistema Cherry Semijoias
            </div>
            <div className="plan-card-expiry">
              Renova em <strong>15/01/2027</strong>
            </div>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 'var(--space-3)' }}>
              Gerenciar plano
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
