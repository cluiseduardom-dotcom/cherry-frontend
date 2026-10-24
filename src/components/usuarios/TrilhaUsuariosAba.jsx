import { useState, useEffect, useCallback } from 'react';
import { History, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { listarEventosUsuarios } from '../../services/usuarios';
import { formatarCargo, formatarDataHora, formatarAcaoEvento } from '../../utils/usuarios';

export default function TrilhaUsuariosAba({ refreshSignal }) {
  const [eventos, setEventos] = useState([]);
  const [paginacao, setPaginacao] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarEventosUsuarios({ page, pageSize: 20 });
      setEventos(data?.items || []);
      setPaginacao({
        page: data?.page || 1,
        pageSize: data?.pageSize || 20,
        total: data?.total || 0,
        totalPages: data?.totalPages || 1,
      });
    } catch (err) {
      setError(err?.message || 'Falha ao carregar trilha de eventos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar(1);
  }, [carregar, refreshSignal]);

  return (
    <div className="card card-padding" style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Trilha de auditoria</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Histórico completo de cadastros, bloqueios e desbloqueios
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => carregar(paginacao.page)}
          disabled={loading}
          title="Atualizar lista de eventos"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto var(--space-2)' }} />
          <div>Carregando histórico de auditoria...</div>
        </div>
      ) : eventos.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <History size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto var(--space-2)' }} />
          <p style={{ fontWeight: 600, margin: 0 }}>Nenhum evento registrado</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Ações de criação e bloqueio de usuários aparecerão nesta trilha.
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Ação</th>
                  <th>Usuário alvo</th>
                  <th>Cargo do alvo</th>
                  <th>Executado por</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map(ev => {
                  const acaoMeta = formatarAcaoEvento(ev.acao);
                  return (
                    <tr key={ev.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatarDataHora(ev.criado_em)}
                      </td>
                      <td>
                        <span className={`badge ${acaoMeta.badgeClass}`}>
                          {acaoMeta.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {ev.alvo_nome || `Usuário #${ev.alvo_usuario_id}`}
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {formatarCargo(ev.cargo_alvo)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {ev.executado_por_nome || `ID #${ev.executado_por}`}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: ev.motivo ? 'var(--text-primary)' : 'var(--text-secondary)', maxWidth: 260 }}>
                        {ev.motivo || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-color, #eee)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Mostrando {eventos.length} de {paginacao.total} eventos
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => carregar(paginacao.page - 1)}
                disabled={paginacao.page <= 1 || loading}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <span style={{ fontSize: '0.85rem', padding: '0 var(--space-2)' }}>
                Página {paginacao.page} de {paginacao.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => carregar(paginacao.page + 1)}
                disabled={paginacao.page >= paginacao.totalPages || loading}
              >
                Próxima
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
