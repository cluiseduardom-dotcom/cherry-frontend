import { useEffect, useState } from 'react';
import {
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { listarMinhasComissoes } from '../../services/comissoes';
import { formatarMoeda } from '../../utils/mascaras';
import {
  formatarDataHora,
  formatarPercentual,
  getComissaoStatusMeta,
} from '../../utils/formatarComissao';

export default function MinhasComissoesAba({
  dataInicio,
  dataFim,
  onVerHistorico,
  onIrParaRepasses,
}) {
  const [items, setItems] = useState([]);
  const [totais, setTotais] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ao alterar datas, reseta para página 1
  useEffect(() => {
    setPage(1);
  }, [dataInicio, dataFim]);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');

    listarMinhasComissoes({
      page,
      pageSize,
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
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
          setError(err.message || 'Erro ao carregar comissões.');
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [dataInicio, dataFim, page, pageSize]);

  const dinheiroARepassarNum = Number(totais?.dinheiro_a_repassar || 0);

  return (
    <div className="comissoes-aba-conteudo">
      {/* Cards de Resumo */}
      {totais && (
        <div className="comissoes-cards-grid">
          <div className="comissoes-kpi-card card card-padding">
            <span className="comissoes-kpi-title">Base de Vendas</span>
            <span className="comissoes-kpi-value text-primary">
              {formatarMoeda(totais.total_base)}
            </span>
            <span className="comissoes-kpi-sub">Vendas com comissão apurada</span>
          </div>

          <div className="comissoes-kpi-card card card-padding">
            <span className="comissoes-kpi-title">Comissão Total</span>
            <span className="comissoes-kpi-value">
              {formatarMoeda(totais.total_comissao)}
            </span>
            <span className="comissoes-kpi-sub">Liberado + Pendente</span>
          </div>

          <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--success">
            <span className="comissoes-kpi-title">Liberado</span>
            <span className="comissoes-kpi-value text-success">
              {formatarMoeda(totais.total_liberado)}
            </span>
            <span className="comissoes-kpi-sub">Pago pelos clientes</span>
          </div>

          <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--warning">
            <span className="comissoes-kpi-title">Pendente</span>
            <span className="comissoes-kpi-value text-warning">
              {formatarMoeda(totais.total_pendente)}
            </span>
            <span className="comissoes-kpi-sub">Aguardando parcelas/repasses</span>
          </div>

          <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--danger">
            <span className="comissoes-kpi-title">Estornado</span>
            <span className="comissoes-kpi-value text-danger">
              {formatarMoeda(totais.total_estornado)}
            </span>
            <span className="comissoes-kpi-sub">Por cancelamento de vendas</span>
          </div>

          <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--success">
            <span className="comissoes-kpi-title">Já Recebido</span>
            <span className="comissoes-kpi-value text-success">
              {formatarMoeda(totais.total_pago ?? 0)}
            </span>
            <span className="comissoes-kpi-sub">Pago a você pela empresa</span>
          </div>

          <div className="comissoes-kpi-card card card-padding">
            <span className="comissoes-kpi-title">A Receber</span>
            <span className="comissoes-kpi-value">
              {formatarMoeda(totais.a_receber ?? 0)}
            </span>
            <span className="comissoes-kpi-sub">Liberado e ainda não pago</span>
          </div>

          <div className="comissoes-kpi-card card card-padding">
            <span className="comissoes-kpi-title">Dinheiro a Repassar</span>
            <span className="comissoes-kpi-value">
              {formatarMoeda(totais.dinheiro_a_repassar)}
            </span>
            <div className="comissoes-kpi-sub">
              {dinheiroARepassarNum > 0 ? (
                <button
                  type="button"
                  className="comissoes-link-action"
                  onClick={onIrParaRepasses}
                >
                  Entregar na loja &rarr;
                </button>
              ) : (
                'Nenhum valor pendente'
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="comissoes-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabela de Comissões */}
      <div className="card">
        {loading && (
          <div className="comissoes-loading-box">
            <span className="spinner" />
            <span>Carregando minhas comissões...</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="empty-state">
            <DollarSign className="empty-state-icon" size={36} />
            <div className="empty-state-title">Nenhuma comissão no período</div>
            <p className="text-sm text-secondary">
              Não encontramos comissões geradas para o filtro de datas selecionado.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="table-scroll">
            <table className="tabela-gestao">
              <thead>
                <tr>
                  <th>Data da Venda</th>
                  <th>Venda</th>
                  <th>Base</th>
                  <th>%</th>
                  <th>Comissão</th>
                  <th>Liberado</th>
                  <th>Pago</th>
                  <th>Pendente</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const meta = getComissaoStatusMeta(item.status);
                  const IconStatus = meta.icon;

                  return (
                    <tr key={item.id}>
                      <td>{formatarDataHora(item.data_venda)}</td>
                      <td>
                        <strong>#{item.venda_id}</strong>
                      </td>
                      <td>{formatarMoeda(item.base_calculo)}</td>
                      <td>{formatarPercentual(item.percentual)}</td>
                      <td>
                        <strong>{formatarMoeda(item.valor)}</strong>
                      </td>
                      <td className="text-success font-medium">
                        {formatarMoeda(item.valor_liberado)}
                      </td>
                      <td>{formatarMoeda(item.valor_pago ?? 0)}</td>
                      <td className="text-secondary font-medium">
                        {formatarMoeda(item.valor_pendente)}
                      </td>
                      <td>
                        <span className={`badge ${meta.badgeClass} comissoes-badge-with-icon`}>
                          <IconStatus size={12} />
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => onVerHistorico(item.id)}
                          title="Ver linha do tempo da comissão"
                        >
                          <FileText size={15} />
                          <span>Histórico</span>
                        </button>
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
              Mostrando {items.length} de {total} comissões
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
