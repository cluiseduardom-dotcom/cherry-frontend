import { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { listarAPagar, listarPagamentosComissao } from '../../services/comissoes';
import { formatarMoeda } from '../../utils/mascaras';
import { formatarData } from '../../utils/formatarData';
import { podePagar, rotuloDaFormaComissao } from '../../utils/pagamentosComissao';

// Admin: o que há a pagar por vendedor (com botão Pagar) + histórico de todos.
// Vendedor / gerente: só o histórico (vendedor vê só os pagamentos dele; o backend garante).
export default function PagamentosComissoesAba({ podePagarComissao, onPagar, refreshKey }) {
  const [aPagar, setAPagar] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [totalPago, setTotalPago] = useState('0.00');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');

    Promise.all([
      podePagarComissao ? listarAPagar() : Promise.resolve(null),
      listarPagamentosComissao({ page, pageSize: 20 }),
    ])
      .then(([resumo, historico]) => {
        if (cancelado) return;
        setAPagar(resumo);
        setPagamentos(historico?.items || []);
        setTotalPago(historico?.totais?.total_pago ?? '0.00');
        setTotalPages(historico?.totalPages || 1);
      })
      .catch(err => { if (!cancelado) setError(err.message || 'Erro ao carregar os pagamentos.'); })
      .finally(() => { if (!cancelado) setLoading(false); });

    return () => { cancelado = true; };
  }, [podePagarComissao, page, refreshKey]);

  return (
    <div className="comissoes-aba-conteudo">
      {error && (
        <div className="comissoes-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && <p className="text-sm text-secondary">Carregando...</p>}

      {!loading && !error && (
        <>
          <div className="comissoes-cards-grid">
            {podePagarComissao && (
              <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--warning">
                <span className="comissoes-kpi-title">Total a pagar</span>
                <span className="comissoes-kpi-value text-warning">{formatarMoeda(aPagar?.totais?.a_pagar ?? 0)}</span>
                <span className="comissoes-kpi-sub">Comissão liberada e ainda não paga</span>
              </div>
            )}
            <div className="comissoes-kpi-card card card-padding comissoes-kpi-card--success">
              <span className="comissoes-kpi-title">{podePagarComissao ? 'Total já pago' : 'Total que você recebeu'}</span>
              <span className="comissoes-kpi-value text-success">{formatarMoeda(totalPago)}</span>
              <span className="comissoes-kpi-sub">Soma dos pagamentos registrados</span>
            </div>
          </div>

          {podePagarComissao && (
            <>
              <h2 className="page-subtitle" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>A pagar por vendedor</h2>
              <p className="text-xs text-secondary" style={{ marginBottom: 'var(--space-2)' }}>
                Só entra aqui a comissão <strong>liberada</strong> (o cliente já pagou; em dinheiro, depois de confirmado o repasse).
                Comissão paga e depois estornada vira desconto no próximo pagamento.
              </p>
              {aPagar?.items?.length ? (
                <div className="card table-scroll">
                  <table className="tabela-gestao">
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th>Comissões</th>
                        <th>Liberado a pagar</th>
                        <th>Descontos</th>
                        <th>Líquido</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aPagar.items.map(linha => (
                        <tr key={linha.vendedor_id}>
                          <td><strong>{linha.vendedor_nome}</strong></td>
                          <td>{linha.quantidade_comissoes}</td>
                          <td>{formatarMoeda(linha.bruto_a_pagar)}</td>
                          <td className={Number(linha.descontos) < 0 ? 'text-danger' : 'text-secondary'}>{formatarMoeda(linha.descontos)}</td>
                          <td><strong>{formatarMoeda(linha.a_pagar)}</strong></td>
                          <td style={{ textAlign: 'right' }}>
                            {podePagar(linha) ? (
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => onPagar(linha)}>
                                <Wallet size={14} /> Pagar
                              </button>
                            ) : (
                              <span className="text-xs text-secondary">Descontos a cobrir</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">Nenhuma comissão liberada aguardando pagamento.</p>
              )}
            </>
          )}

          <h2 className="page-subtitle" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>
            {podePagarComissao ? 'Pagamentos registrados' : 'Pagamentos recebidos'}
          </h2>
          {pagamentos.length === 0 ? (
            <p className="text-sm text-secondary">Nenhum pagamento registrado.</p>
          ) : (
            <div className="card table-scroll">
              <table className="tabela-gestao">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Vendedor</th>
                    <th>Valor</th>
                    <th>Forma</th>
                    <th>Vendas cobertas</th>
                    <th>Registrado por</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map(p => (
                    <tr key={p.id}>
                      <td>{formatarData(p.pago_em)}</td>
                      <td>{p.vendedor_nome}</td>
                      <td><strong>{formatarMoeda(p.valor)}</strong></td>
                      <td>{rotuloDaFormaComissao(p.forma)}</td>
                      <td>{p.itens.filter(i => Number(i.valor) > 0).map(i => `#${i.venda_id}`).join(', ') || '—'}</td>
                      <td>{p.criado_por_nome}</td>
                      <td className="text-secondary">{p.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="comissoes-paginacao">
              <button type="button" className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-sm text-secondary">Página {page} de {totalPages}</span>
              <button type="button" className="btn btn-sm btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
