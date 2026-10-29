import { useEffect, useState } from 'react';
import Avatar from '../Avatar';
import { AlertCircle, CalendarClock, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { definirModoPagamentoComissao, listarAPagar, listarPagamentosComissao } from '../../services/comissoes';
import { useToast } from '../../context/ToastContext';
import { formatarMoeda } from '../../utils/mascaras';
import { formatarData } from '../../utils/formatarData';
import {
  MODOS_PAGAMENTO_COMISSAO, descricaoDoModoComissao, podePagar, rotuloDaFormaComissao, temAguardandoFechamento,
} from '../../utils/pagamentosComissao';

// Quem tem `gerir_financeiro` (Analista financeiro, Diretor, Gerente, Admin): o que há a pagar por
// vendedor (com botão Pagar) + histórico de todos. Só o admin escolhe QUANDO a empresa paga.
// Vendedor / demais: só o histórico (vendedor vê só os pagamentos dele; o backend garante).
export default function PagamentosComissoesAba({ podePagarComissao, podeAlterarModo, onPagar, refreshKey }) {
  const toast = useToast();
  const [recarga, setRecarga] = useState(0);
  const [salvandoModo, setSalvandoModo] = useState(false);
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
  }, [podePagarComissao, page, refreshKey, recarga]);

  const modo = aPagar?.modo_pagamento ?? 'liberada';
  const fimDoMes = modo === 'fim_do_mes';

  async function handleMudarModo(novoModo) {
    if (novoModo === modo || salvandoModo) return;
    setSalvandoModo(true);
    try {
      await definirModoPagamentoComissao(novoModo);
      toast?.success?.(`Pagamento de comissão: ${descricaoDoModoComissao(novoModo).rotulo.toLowerCase()}.`);
      setRecarga(n => n + 1);
    } catch (err) {
      toast?.error?.(err.message || 'Não foi possível alterar o modo de pagamento.');
    } finally {
      setSalvandoModo(false);
    }
  }

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
            {podePagarComissao && fimDoMes && (
              <div className="comissoes-kpi-card card card-padding">
                <span className="comissoes-kpi-title">Aguardando fechamento do mês</span>
                <span className="comissoes-kpi-value">{formatarMoeda(aPagar?.totais?.aguardando_fechamento ?? 0)}</span>
                <span className="comissoes-kpi-sub">Vendas do mês corrente, pagáveis a partir do dia 1º</span>
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
              <div className="comissoes-repasse-card card card-padding" style={{ marginTop: 'var(--space-4)' }}>
                <label htmlFor="modo-pagamento-comissao" className="input-label">
                  <CalendarClock size={14} /> Quando pagar a comissão
                </label>
                {podeAlterarModo ? (
                  <select
                    id="modo-pagamento-comissao"
                    className="input-field"
                    value={modo}
                    disabled={salvandoModo}
                    onChange={e => handleMudarModo(e.target.value)}
                  >
                    {MODOS_PAGAMENTO_COMISSAO.map(m => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
                  </select>
                ) : (
                  <strong style={{ display: 'block', marginTop: 'var(--space-1)' }}>{descricaoDoModoComissao(modo).rotulo}</strong>
                )}
                <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                  {descricaoDoModoComissao(modo).descricao}
                  {!podeAlterarModo && ' Só o administrador altera esta opção.'}
                </p>
              </div>

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
                        {fimDoMes && <th>Aguardando fechamento</th>}
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aPagar.items.map(linha => (
                        <tr key={linha.vendedor_id}>
                          <td>
                            <span className="comissoes-vendedor">
                              <Avatar nome={linha.vendedor_nome} fotoUrl={linha.vendedor_foto_url} className="comissoes-avatar" vazio="U" />
                              <strong>{linha.vendedor_nome}</strong>
                            </span>
                          </td>
                          <td>{linha.quantidade_comissoes}</td>
                          <td>{formatarMoeda(linha.bruto_a_pagar)}</td>
                          <td className={Number(linha.descontos) < 0 ? 'text-danger' : 'text-secondary'}>{formatarMoeda(linha.descontos)}</td>
                          <td><strong>{formatarMoeda(linha.a_pagar)}</strong></td>
                          {fimDoMes && <td className="text-secondary">{formatarMoeda(linha.aguardando_fechamento ?? 0)}</td>}
                          <td style={{ textAlign: 'right' }}>
                            {podePagar(linha) ? (
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => onPagar(linha)}>
                                <Wallet size={14} /> Pagar
                              </button>
                            ) : (
                              <span className="text-xs text-secondary">
                                {temAguardandoFechamento(linha) && Number(linha.a_pagar) === 0 ? 'Aguarda o fechamento do mês' : 'Descontos a cobrir'}
                              </span>
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
                      <td>
                        <span className="comissoes-vendedor">
                          <Avatar nome={p.vendedor_nome} fotoUrl={p.vendedor_foto_url} className="comissoes-avatar" vazio="U" />
                          {p.vendedor_nome}
                        </span>
                      </td>
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
