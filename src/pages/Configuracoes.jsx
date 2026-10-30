import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Globe, ChevronRight, FolderTree, Landmark } from 'lucide-react';
import Avatar from '../components/Avatar';
import EditarUsuarioModal from '../components/usuarios/EditarUsuarioModal';
import { useToast } from '../context/ToastContext';
import './Configuracoes.css';

const sections = [
  {
    title: 'Catálogo',
    icon: FolderTree,
    items: [
      { label: 'Categorias de produto', sub: 'Níveis, códigos e categorias', path: '/configuracoes/categorias' },
      { label: 'Padrões de SKU', sub: 'Padrões por produto, segmentos e sequência automática', path: '/configuracoes/sku' },
    ],
  },
  {
    title: 'Conta',
    icon: User,
    items: [
      { label: 'Perfil de usuário',     sub: 'Telefone, endereço e dados cadastrais', acao: 'perfil' },
      { label: 'Segurança',             sub: 'Alterar senha', path: '/conta/seguranca' },
    ],
  },
  {
    title: 'Empresa',
    icon: Globe,
    items: [
      { label: 'Gestão de usuários',    sub: 'Equipe, acessos e auditoria', path: '/usuarios' },
      { label: 'Dados da empresa',      sub: 'CNPJ, endereço e contato', path: '/configuracoes/empresa' },
    ],
  },
];

// Só para o operador da plataforma (user.plataforma_admin): o backend é quem barra de fato.
const secaoPlataforma = {
  title: 'Vertumno',
  icon: Landmark,
  items: [
    { label: 'Taxas a receber', sub: 'Taxa da plataforma por loja, mês a mês', path: '/plataforma/taxas' },
    { label: 'Planos e condições', sub: 'Plano e exceção de taxa de cada empresa', path: '/plataforma/empresas' },
  ],
};

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  // Referência estável: o modal recarrega o detalhe sempre que este objeto muda.
  const usuarioPerfil = useMemo(
    () => (user ? { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo } : null),
    [user]
  );

  const nomeUsuario = user?.nome || 'Usuário';
  const emailUsuario = user?.email || '—';
  const roleLabels = { admin: 'Administrador(a)', vendedor: 'Vendedor(a)', estoquista: 'Estoquista' };
  const roleLabel = roleLabels[user?.role] || 'Usuário';

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
          {(user?.plataforma_admin ? [...sections, secaoPlataforma] : sections).map(({ title, icon: Icon, items }) => (
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
                    onClick={item.path ? () => navigate(item.path) : item.acao === 'perfil' ? () => setEditandoPerfil(true) : undefined}
                    disabled={!item.path && !item.acao}
                    aria-disabled={!item.path && !item.acao}
                  >
                    <div className="config-item-info">
                      <div className="config-item-label">{item.label}</div>
                      <div className="config-item-sub">
                        {item.sub}
                        {!item.path && !item.acao && <span className="config-item-soon">Em breve</span>}
                      </div>
                    </div>
                    {(item.path || item.acao) && <ChevronRight size={16} className="config-item-arrow" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Profile card */}
        <div className="configuracoes-profile">
          <div className="card card-padding profile-card">
            <Avatar nome={nomeUsuario} fotoUrl={user?.foto_url} className="profile-card-avatar" />
            <div className="profile-card-name">{nomeUsuario}</div>
            <div className="profile-card-role"><span className={`role-badge role-badge--${user?.role || "admin"}`}>{roleLabel}</span></div>
            <div className="profile-card-email">{emailUsuario}</div>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={() => setEditandoPerfil(true)}
            >
              <User size={15} />
              Editar perfil
            </button>
          </div>
        </div>
      </div>

      <EditarUsuarioModal
        open={editandoPerfil}
        usuario={usuarioPerfil}
        onClose={() => setEditandoPerfil(false)}
        onSuccess={(resultado) => {
          toast.success(resultado?.alterado ? 'Seus dados foram atualizados.' : 'Nenhuma alteração nos seus dados.');
        }}
      />
    </div>
  );
}
