import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Search,
  History,
  Lock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { listarUsuarios } from '../services/usuarios';
import { formatarCargo, formatarDataHora } from '../utils/usuarios';
import CriarUsuarioModal from '../components/usuarios/CriarUsuarioModal';
import BloquearUsuarioModal from '../components/usuarios/BloquearUsuarioModal';
import TrilhaUsuariosAba from '../components/usuarios/TrilhaUsuariosAba';
import './Usuarios.css';
import '../components/TabelaGestao.css';

function extrairIniciais(nome) {
  if (!nome) return 'U';
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

export default function Usuarios() {
  const toast = useToast();

  const [abaAtiva, setAbaAtiva] = useState('usuarios'); // 'usuarios' | 'trilha'
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos' | 'ativos' | 'bloqueados'

  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [usuarioParaBloqueio, setUsuarioParaBloqueio] = useState(null);
  const [trilhaSignal, setTrilhaSignal] = useState(0);

  const carregarUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Falha ao carregar a lista de usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  function handleUsuarioCriado(novoUsuario) {
    toast.success(`Usuário "${novoUsuario.nome}" cadastrado com sucesso.`);
    carregarUsuarios();
    setTrilhaSignal(s => s + 1);
  }

  function handleBloqueioConcluido(resultado) {
    const acao = resultado.ativo ? 'desbloqueado' : 'bloqueado';
    toast.success(resultado.alterado
        ? `Status do usuário "${resultado.nome}" alterado para ${acao}.`
        : `O usuário "${resultado.nome}" já se encontrava ${acao}.`);
    carregarUsuarios();
    setTrilhaSignal(s => s + 1);
  }

  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroStatus === 'ativos' && !u.ativo) return false;
    if (filtroStatus === 'bloqueados' && u.ativo) return false;

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      const nomeMatch = u.nome?.toLowerCase().includes(termo);
      const emailMatch = u.email?.toLowerCase().includes(termo);
      const cargoMatch = formatarCargo(u.cargo)?.toLowerCase().includes(termo);
      if (!nomeMatch && !emailMatch && !cargoMatch) return false;
    }

    return true;
  });

  const totalAtivos = usuarios.filter(u => u.ativo).length;
  const totalBloqueados = usuarios.filter(u => !u.ativo).length;

  return (
    <div className="page-content usuarios-page">
      {/* Cabeçalho */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Gestão de Usuários</h1>
          <p className="page-subtitle">Controle de equipe, cargos e auditoria de acessos da empresa</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalCriarAberto(true)}
          >
            <UserPlus size={16} />
            Novo usuário
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="usuarios-tabs">
        <button
          type="button"
          className={`usuarios-tab-btn ${abaAtiva === 'usuarios' ? 'usuarios-tab-btn--active' : ''}`}
          onClick={() => setAbaAtiva('usuarios')}
        >
          <Users size={16} />
          Usuários ({usuarios.length})
        </button>
        <button
          type="button"
          className={`usuarios-tab-btn ${abaAtiva === 'trilha' ? 'usuarios-tab-btn--active' : ''}`}
          onClick={() => setAbaAtiva('trilha')}
        >
          <History size={16} />
          Trilha de auditoria
        </button>
      </div>

      {abaAtiva === 'trilha' ? (
        <TrilhaUsuariosAba refreshSignal={trilhaSignal} />
      ) : (
        <div className="card card-padding">
          {/* Barra de Filtros */}
          <div className="usuarios-filtros-bar">
            <div className="usuarios-busca-wrap">
              <Search size={16} className="usuarios-busca-icon" />
              <input
                type="text"
                className="input-field usuarios-busca-input"
                placeholder="Buscar por nome, e-mail ou cargo..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <select
                className="input-field usuarios-filtro-status"
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
              >
                <option value="todos">Todos os status ({usuarios.length})</option>
                <option value="ativos">Ativos ({totalAtivos})</option>
                <option value="bloqueados">Bloqueados ({totalBloqueados})</option>
              </select>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={carregarUsuarios}
                disabled={loading}
                title="Atualizar lista"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {error && (
            <div className="modal-error" role="alert">{error}</div>
          )}

          {loading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto var(--space-2)' }} />
              <div>Carregando equipe...</div>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <Users size={32} style={{ color: 'var(--color-text-secondary)', margin: '0 auto var(--space-2)' }} />
              <p style={{ fontWeight: 600, margin: 0 }}>Nenhum usuário encontrado</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                {busca || filtroStatus !== 'todos'
                  ? 'Nenhum usuário corresponde aos filtros aplicados.'
                  : 'Nenhum usuário cadastrado além do administrador.'}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="tabela-gestao">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Cargo</th>
                    <th>Status</th>
                    <th>Cadastrado em</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map(u => {
                    const iniciais = extrairIniciais(u.nome);
                    const podeGerenciar = Boolean(u.pode_gerenciar);
                    const motivoBloqueioGestao = u.motivo_bloqueio_gestao;

                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="usuarios-user-cell">
                            <div className="usuarios-avatar">{iniciais}</div>
                            <div>
                              <div className="usuarios-user-nome">{u.nome}</div>
                              <div className="usuarios-user-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-primary">
                            {formatarCargo(u.cargo)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.ativo ? 'badge-success' : 'badge-danger'}`}>
                            {u.ativo ? 'Ativo' : 'Bloqueado'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                          {formatarDataHora(u.criado_em)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="usuarios-actions-cell" style={{ justifyContent: 'flex-end' }}>
                            {podeGerenciar ? (
                              <button
                                type="button"
                                className={`btn btn-sm ${u.ativo ? 'btn-ghost' : 'btn-primary'}`}
                                onClick={() => setUsuarioParaBloqueio(u)}
                                title={u.ativo ? 'Bloquear usuário' : 'Desbloquear usuário'}
                              >
                                {u.ativo ? (
                                  <>
                                    <ShieldAlert size={14} style={{ color: 'var(--color-danger, #e53935)' }} />
                                    <span>Bloquear</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={14} />
                                    <span>Desbloquear</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <div
                                className="usuarios-motivo-hint"
                                title={motivoBloqueioGestao || 'Você não tem permissão para gerenciar este usuário'}
                              >
                                <Lock size={14} />
                                <span>{motivoBloqueioGestao || 'Protegido'}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <CriarUsuarioModal
        open={modalCriarAberto}
        onClose={() => setModalCriarAberto(false)}
        onSuccess={handleUsuarioCriado}
      />

      <BloquearUsuarioModal
        open={Boolean(usuarioParaBloqueio)}
        usuario={usuarioParaBloqueio}
        onClose={() => setUsuarioParaBloqueio(null)}
        onSuccess={handleBloqueioConcluido}
      />
    </div>
  );
}
