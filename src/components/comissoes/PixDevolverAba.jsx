import { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { listarDevolucoesPix, listarPixADevolver } from '../../services/pixDevolucao';
import { formatarMoeda } from '../../utils/mascaras';
import { formatarDataHora } from '../../utils/formatarComissao';
import { rotuloOrigemPix, rotuloStatusDevolucao } from '../../utils/pixDevolucao';

const POR_PAGINA = 20;

// Pix pago que pode voltar ao pagador (sem venda concluída ou de venda cancelada) + histórico das
// devoluções. Só quem tem `gerir_financeiro` chega aqui; o backend decide de novo.
export default function PixDevolverAba({ onDevolver, refreshKey }) {
  const [pagina, setPagina] = useState(1);
  const [aDevolver, setADevolver] = useState({ items: [], total: 0, valor_total: '0.00' });
  const [historico, setHistorico] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');

    Promise.all([
      listarPixADevolver({ page: pagina, pageSize: POR_PAGINA }),
      listarDevolucoesPix({ page: 1, pageSize: POR_PAGINA }),
    ])
      .then(([lista, devolucoes]) => {
        if (cancelado) return;
        setADevolver(lista);
        setHistorico(devolucoes);
      })
      .catch(err => { if (!cancelado) setError(err.message || 'Erro ao carregar os Pix.'); })
      .finally(() => { if (!cancelado) setLoading(false); });

    return () => { cancelado = true; };
  }, [pagina, refreshKey]);

  const totalPaginas = Math.max(1, Math.ceil(aDevolver.total / POR_PAGINA));

  return (
    <div className="comissoes-aba">
      <p className="text-sm text-secondary">
        Pix pagos pelo Mercado Pago que não estão em nenhuma venda ativa: o cliente pagou e a venda não foi concluída, ou a venda foi cancelada.
        Cancelar uma venda não devolve o Pix sozinho: a devolução é feita aqui.
      </p>

      {error && (
        <div className="comissoes-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        {loading && (
          <div className="comissoes-loading-box">
            <span className="spinner" />
            <span>Carregando Pix...</span>
          </div>
        )}

        {!loading && aDevolver.items.length === 0 && (
          <div className="empty-state">
            <Undo2 className="empty-state-icon" size={36} />
            <div className="empty-state-title">Nenhum Pix a devolver</div>
            <p className="text-sm text-secondary">Todo Pix pago está ligado a uma venda ativa.</p>
          </div>
        )}

        {!loading && aDevolver.items.length > 0 && (
          <>
            <div className="table-scroll">
              <table className="tabela-gestao">
                <thead>
                  <tr>
                    <th>Cobrado em</th>
                    <th>Origem</th>
                    <th>Valor</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {aDevolver.items.map(item => (
                    <tr key={item.codigo}>
                      <td>{formatarDataHora(item.criado_em)}</td>
                      <td>{rotuloOrigemPix(item)}</td>
                      <td><strong>{formatarMoeda(item.valor)}</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onDevolver(item)}>
                          <Undo2 size={14} /> Devolver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="comissoes-pagination">
              <span className="text-sm text-secondary">
                {aDevolver.total} Pix · {formatarMoeda(aDevolver.valor_total)} a devolver
              </span>
              {totalPaginas > 1 && (
                <div className="comissoes-pagination-controls">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)} aria-label="Página anterior">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm">{pagina} / {totalPaginas}</span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)} aria-label="Próxima página">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!loading && historico.items.length > 0 && (
        <div className="card">
          <h3 className="comissoes-subtitulo" style={{ padding: 'var(--space-4) var(--space-4) 0' }}>Devoluções registradas</h3>
          <div className="table-scroll">
            <table className="tabela-gestao">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Motivo</th>
                  <th>Por</th>
                </tr>
              </thead>
              <tbody>
                {historico.items.map(d => (
                  <tr key={d.id}>
                    <td>{formatarDataHora(d.criado_em)}</td>
                    <td><strong>{formatarMoeda(d.valor)}</strong></td>
                    <td>
                      {rotuloStatusDevolucao(d.status)}
                      {d.status === 'falhou' && d.erro && <small className="text-secondary"> · {d.erro}</small>}
                    </td>
                    <td>{d.motivo}</td>
                    <td>{d.solicitado_por_nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
