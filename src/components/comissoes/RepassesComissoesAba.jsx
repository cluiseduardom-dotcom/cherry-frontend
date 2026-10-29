import { useEffect, useState } from 'react';
import Avatar from '../Avatar';
import {
  HandCoins,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { listarRepasses } from '../../services/comissoes';
import { formatarMoeda } from '../../utils/mascaras';
import { formatarDataHora, getRepasseStatusMeta } from '../../utils/formatarComissao';

const STATUS_OPTIONS = [
  { value: 'a_repassar', label: 'A Repassar' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'cancelado', label: 'Cancelados' },
  { value: '', label: 'Todos' },
];

export default function RepassesComissoesAba({
  user,
  temCapacidadeVerTodos,
  podeConfirmar,
  onConfirmar,
  refreshKey,
}) {
  const [statusFilter, setStatusFilter] = useState('a_repassar');
  const [items, setItems] = useState([]);
  const [totais, setTotais] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ao alterar filtro de status, volta à página 1
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');

    listarRepasses({
      status: statusFilter || undefined,
      page,
      pageSize,
    })
      .then(res => {
        if (!cancelado) {
          setItems(res?.items || []);
          setTotais(res?.totais || null);
          setTotalPages(res?.totalPages || 1);
          setTotal(res?.total || 0);
        }
      })
      .catch(err => {
        if (!cancelado) {
          setError(err.message || 'Erro ao carregar repasses.');
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [statusFilter, page, pageSize, refreshKey]);

  const currentUserId = user?.id ?? user?.usuario_id;

  return (
    <div className="comissoes-aba-conteudo">
      {/* Aviso Explicativo de Fluxo em Duas Etapas */}
      <div className="comissoes-alerta-info">
        <AlertTriangle size={20} className="text-warning flex-shrink-0" />
        <div className="text-sm">
          <strong>Controle de Dinheiro em Espécie (Dois Passos):</strong>
          <p>
            Vendas com pagamento em dinheiro e comissão geram repasses pendentes. O vendedor declara o valor na finalização da venda, e a comissão é liberada assim que outro responsável com permissão de gestão confirma o recebimento físico do dinheiro na loja. Autoconfirmação é bloqueada.
          </p>
        </div>
      </div>

      {/* Card de Resumo + Filtros de Status */}
      <div className="comissoes-repasses-header-row">
        {totais && (
          <div className="comissoes-kpi-card card card-padding" style={{ maxWidth: '300px' }}>
            <span className="comissoes-kpi-title">Total Pendente de Repasse</span>
            <span className="comissoes-kpi-value text-primary">
              {formatarMoeda(totais.total_a_repassar)}
            </span>
            <span className="comissoes-kpi-sub">
              {temCapacidadeVerTodos ? 'Saldo total da empresa' : 'Seu saldo a entregar'}
            </span>
          </div>
        )}

        <div className="comissoes-status-pills">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`comissoes-status-pill ${
                statusFilter === opt.value ? 'comissoes-status-pill--active' : ''
              }`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="comissoes-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabela de Repasses */}
      <div className="card">
        {loading && (
          <div className="comissoes-loading-box">
            <span className="spinner" />
            <span>Carregando repasses...</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="empty-state">
            <HandCoins className="empty-state-icon" size={36} />
            <div className="empty-state-title">Nenhum repasse encontrado</div>
            <p className="text-sm text-secondary">
              Não há repasses com o status selecionado.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="table-scroll">
            <table className="tabela-gestao">
              <thead>
                <tr>
                  <th>Declarado em</th>
                  <th>Vendedor</th>
                  <th>Venda</th>
                  <th>Valor em Dinheiro</th>
                  <th>Status</th>
                  <th>Confirmação</th>
                  <th>Observação</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const meta = getRepasseStatusMeta(item.status);
                  const IconStatus = meta.icon;
                  const isOwner = currentUserId && Number(currentUserId) === Number(item.vendedor_id);
                  const canConfirm = podeConfirmar && item.status === 'a_repassar' && !isOwner;

                  return (
                    <tr key={item.id}>
                      <td>{formatarDataHora(item.declarado_em)}</td>
                      <td>
                        <span className="comissoes-vendedor">
                          <Avatar nome={item.vendedor_nome} fotoUrl={item.vendedor_foto_url} className="comissoes-avatar" vazio="U" />
                          <strong>{item.vendedor_nome}</strong>
                        </span>
                      </td>
                      <td>
                        <strong>#{item.venda_id}</strong>
                      </td>
                      <td className="font-semibold text-primary">
                        {formatarMoeda(item.valor)}
                      </td>
                      <td>
                        <span className={`badge ${meta.badgeClass} comissoes-badge-with-icon`}>
                          <IconStatus size={12} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="text-sm">
                        {item.confirmado_em ? (
                          <div>
                            <span>{item.confirmado_por_nome || 'Gestor'}</span>
                            <span className="text-xs text-secondary block">
                              {formatarDataHora(item.confirmado_em)}
                            </span>
                          </div>
                        ) : item.status === 'cancelado' ? (
                          <span className="text-xs text-secondary">Venda cancelada</span>
                        ) : (
                          <span className="text-xs text-warning">Pendente de entrega</span>
                        )}
                      </td>
                      <td className="text-sm text-secondary">
                        {item.observacao || '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.status === 'a_repassar' ? (
                          canConfirm ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => onConfirmar(item)}
                            >
                              <CheckCircle2 size={14} />
                              Confirmar recebimento
                            </button>
                          ) : isOwner ? (
                            <span
                              className="badge badge-warning comissoes-badge-with-icon"
                              title="Você é o vendedor que recebeu o dinheiro. A confirmação deve ser feita por outro gestor."
                            >
                              <Lock size={12} />
                              Seu repasse
                            </span>
                          ) : (
                            <span className="text-xs text-secondary">
                              Aguardando gestor
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-secondary">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="comissoes-paginacao">
            <span className="text-sm text-secondary">
              Mostrando {items.length} de {total} repasses
            </span>
            <div className="comissoes-paginacao-botoes">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <span className="text-sm font-medium">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Próxima
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
