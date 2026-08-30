import { useEffect, useMemo, useState } from 'react';
import { Download, AlertTriangle, Search, X, BarChart2 } from 'lucide-react';
import { listarProdutos } from '../../services/produtos';
import { listarMovimentacoesProduto } from '../../services/estoque';
import {
  formatDateBR,
  todayISO,
  isoDaysFromToday,
  listarDiasNoPeriodo,
  buscarTodasAsPaginas,
  exportarRelatorioPDF,
} from './relatoriosUtils';

const TIPO_BADGE = {
  entrada: { className: 'badge-success', label: 'Entrada' },
  saida: { className: 'badge-warning', label: 'Saída' },
  ajuste: { className: 'badge-info', label: 'Ajuste' },
};

export default function RelatorioEstoque() {
  const [filtroInicio, setFiltroInicio] = useState(isoDaysFromToday(-30));
  const [filtroFim, setFiltroFim] = useState(todayISO());

  const [produtoQuery, setProdutoQuery] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');

  const dataInvalida = filtroInicio > filtroFim;

  useEffect(() => {
    let cancelled = false;

    async function loadProdutos() {
      try {
        const data = await buscarTodasAsPaginas(params => listarProdutos({ ...params, canal: 'loja_fisica' }));
        if (!cancelled) setProdutos(data);
      } catch {
        // Falha aqui não impede o carregamento das movimentações; só afeta
        // nomes de produto e KPIs de saldo/inativos.
      }
    }

    loadProdutos();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (dataInvalida || produtos.length === 0) {
      if (!dataInvalida) return; // ainda esperando produtos carregarem
      setMovimentacoes([]);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const produtosAlvo = produtoSelecionado ? [produtoSelecionado] : produtos;
        const listasPorProduto = await Promise.all(
          produtosAlvo.map(p => buscarTodasAsPaginas(params => listarMovimentacoesProduto(p.id, params)))
        );
        if (cancelled) return;

        const produtosPorId = new Map(produtos.map(p => [p.id, p]));
        const todas = listasPorProduto.flat().map(m => ({
          ...m,
          produtoNome: produtosPorId.get(m.produto_id)?.nome ?? `#${m.produto_id}`,
        }));

        const filtradas = todas.filter(m => {
          const dia = String(m.criado_em).slice(0, 10);
          return dia >= filtroInicio && dia <= filtroFim;
        });

        filtradas.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
        setMovimentacoes(filtradas);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [produtos, produtoSelecionado, filtroInicio, filtroFim, dataInvalida]);

  const sugestoes = useMemo(() => {
    if (!produtoQuery.trim() || produtoSelecionado) return [];
    const termo = produtoQuery.trim().toLowerCase();
    return produtos
      .filter(p => p.nome.toLowerCase().includes(termo) || (p.sku ?? '').toLowerCase().includes(termo))
      .slice(0, 8);
  }, [produtoQuery, produtos, produtoSelecionado]);

  function handleSelecionarProduto(p) {
    setProdutoSelecionado(p);
    setProdutoQuery(p.nome);
    setMostrarSugestoes(false);
  }

  function handleLimparProduto() {
    setProdutoSelecionado(null);
    setProdutoQuery('');
  }

  const saldoTotal = useMemo(
    () => produtos.filter(p => p.ativo).reduce((s, p) => s + Number(p.estoque_atual), 0),
    [produtos]
  );
  const itensBaixoEstoque = useMemo(
    () => produtos.filter(p => p.ativo && Number(p.estoque_atual) <= 5).length,
    [produtos]
  );
  const produtosInativos = useMemo(() => produtos.filter(p => !p.ativo).length, [produtos]);
  const movimentoLiquido = useMemo(() => {
    return movimentacoes.reduce((s, m) => {
      if (m.tipo === 'entrada') return s + Number(m.quantidade);
      if (m.tipo === 'saida') return s - Number(m.quantidade);
      return s;
    }, 0);
  }, [movimentacoes]);

  const dadosGrafico = useMemo(() => {
    if (dataInvalida) return [];
    const dias = listarDiasNoPeriodo(filtroInicio, filtroFim);
    const porDia = new Map(dias.map(d => [d, { entrada: 0, saida: 0 }]));
    for (const m of movimentacoes) {
      const dia = String(m.criado_em).slice(0, 10);
      const bucket = porDia.get(dia);
      if (!bucket) continue;
      if (m.tipo === 'entrada') bucket.entrada += Number(m.quantidade);
      if (m.tipo === 'saida') bucket.saida += Number(m.quantidade);
    }
    return dias.map(dia => ({ dia, ...porDia.get(dia) }));
  }, [movimentacoes, filtroInicio, filtroFim, dataInvalida]);

  const maxGrafico = Math.max(1, ...dadosGrafico.map(d => Math.max(d.entrada, d.saida)));
  const skipLabel = Math.max(1, Math.ceil(dadosGrafico.length / 14));

  async function handleExportar() {
    setExportError('');
    setExportando(true);
    try {
      const periodoLabel = `Período: ${formatDateBR(filtroInicio)} a ${formatDateBR(filtroFim)}${produtoSelecionado ? ` · Produto: ${produtoSelecionado.nome}` : ''}`;
      await exportarRelatorioPDF({
        elementId: 'relatorio-estoque-container',
        filename: `Relatorio_Estoque_${todayISO()}.pdf`,
        titulo: 'Relatório de Estoque',
        periodoLabel,
      });
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div className="rel-filtros">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="re-inicio">Data início</label>
          <input id="re-inicio" type="date" className="input-field" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="re-fim">Data fim</label>
          <input id="re-fim" type="date" className="input-field" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} />
        </div>
        <div className="input-wrapper rel-produto-typeahead">
          <label className="input-label" htmlFor="re-produto">Produto</label>
          <div className="input-icon-wrapper">
            <Search size={16} className="input-icon" />
            <input
              id="re-produto"
              type="text"
              className="input-field"
              placeholder="Todos os produtos"
              value={produtoQuery}
              onChange={e => { setProdutoQuery(e.target.value); setProdutoSelecionado(null); setMostrarSugestoes(true); }}
              onFocus={() => setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
            />
            {produtoSelecionado && (
              <button type="button" className="rel-typeahead-clear" onClick={handleLimparProduto} aria-label="Limpar produto">
                <X size={14} />
              </button>
            )}
          </div>
          {mostrarSugestoes && sugestoes.length > 0 && (
            <div className="rel-typeahead-dropdown">
              {sugestoes.map(p => (
                <button type="button" key={p.id} className="rel-typeahead-item" onMouseDown={() => handleSelecionarProduto(p)}>
                  {p.nome} {p.sku ? <span className="text-sm text-secondary">({p.sku})</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-primary rel-export-btn" onClick={handleExportar} disabled={exportando || dataInvalida || loading}>
          <Download size={16} />
          {exportando ? 'Exportando...' : 'Exportar PDF'}
        </button>
      </div>

      {dataInvalida && (
        <p className="rel-inline-error"><AlertTriangle size={14} /> A data início não pode ser depois da data fim.</p>
      )}
      {exportError && <p className="rel-inline-error"><AlertTriangle size={14} /> {exportError}</p>}

      {loading && !dataInvalida && (
        <div className="empty-state"><p className="text-sm text-secondary">Carregando relatório de estoque...</p></div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar o relatório de estoque</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && !dataInvalida && (
        <div id="relatorio-estoque-container">
          <div className="rel-kpis">
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Saldo total</div>
              <div className="rel-kpi-value">{saldoTotal}</div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Itens com baixo estoque</div>
              <div className="rel-kpi-value">{itensBaixoEstoque}</div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Movimento líquido (período)</div>
              <div className={`rel-kpi-value ${movimentoLiquido < 0 ? 'rel-kpi-value--danger' : ''}`}>
                {movimentoLiquido > 0 ? '+' : ''}{movimentoLiquido}
              </div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Produtos inativos</div>
              <div className="rel-kpi-value">{produtosInativos}</div>
            </div>
          </div>

          <div className="card card-padding rel-chart-card">
            <div className="rel-chart-header">
              <h2 className="section-title">Entradas x Saídas por Dia</h2>
              <BarChart2 size={16} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div className="rel-chart-legend">
              <span><span className="rel-legend-dot" style={{ background: 'var(--color-success)' }} /> Entradas</span>
              <span><span className="rel-legend-dot" style={{ background: 'var(--color-danger)' }} /> Saídas</span>
            </div>
            {dadosGrafico.length === 0 ? (
              <p className="text-sm text-secondary">Sem dados para o período.</p>
            ) : (
              <div className="rel-bar-chart">
                {dadosGrafico.map((d, i) => (
                  <div key={d.dia} className="rel-bar-wrap">
                    <div className="rel-bar-track rel-bar-track--grouped">
                      <div className="rel-bar-fill" style={{ height: `${(d.entrada / maxGrafico) * 100}%`, background: 'var(--color-success)' }} title={`Entradas: ${d.entrada}`} />
                      <div className="rel-bar-fill" style={{ height: `${(d.saida / maxGrafico) * 100}%`, background: 'var(--color-danger)' }} title={`Saídas: ${d.saida}`} />
                    </div>
                    <div className="rel-bar-label">{i % skipLabel === 0 ? d.dia.slice(8, 10) + '/' + d.dia.slice(5, 7) : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card rel-table-card">
            <table className="rel-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Saldo após</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map(m => {
                  const baixo = Number(m.estoque_resultante) <= 5;
                  const tipoInfo = TIPO_BADGE[m.tipo] ?? { className: 'badge-info', label: m.tipo };
                  return (
                    <tr key={m.id} className={`rel-row ${baixo ? 'rel-row--baixo-estoque' : ''}`}>
                      <td>{formatDateBR(String(m.criado_em).slice(0, 10))}</td>
                      <td>{m.produtoNome}</td>
                      <td><span className={`badge ${tipoInfo.className}`}>{tipoInfo.label}</span></td>
                      <td>{m.quantidade}</td>
                      <td>
                        {m.estoque_resultante}
                        {baixo && <span className="badge badge-warning" style={{ marginLeft: 6 }}>Baixo estoque</span>}
                      </td>
                      <td>{m.motivo || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {movimentacoes.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-title">Nenhum registro encontrado para os filtros selecionados</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
