import { useEffect, useMemo, useState } from 'react';
import { Download, AlertTriangle, BarChart2 } from 'lucide-react';
import { listarVendas, buscarVenda } from '../../services/vendas';
import { listarClientes } from '../../services/clientes';
import {
  formatCurrency,
  formatDateBR,
  todayISO,
  isoDaysFromToday,
  weekdayLabel,
  listarDiasNoPeriodo,
  buscarTodasAsPaginas,
  exportarRelatorioPDF,
} from './relatoriosUtils';

const CANAL_LABEL = { loja_fisica: 'Loja física', online: 'Online' };
const CANAL_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'loja_fisica', label: 'Loja física' },
  { value: 'online', label: 'Online' },
];

export default function RelatorioVendas() {
  const [filtroInicio, setFiltroInicio] = useState(isoDaysFromToday(-30));
  const [filtroFim, setFiltroFim] = useState(todayISO());
  const [filtroCanal, setFiltroCanal] = useState('');

  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');

  const dataInvalida = filtroInicio > filtroFim;

  useEffect(() => {
    if (dataInvalida) {
      setVendas([]);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [todasVendas, clientes] = await Promise.all([
          buscarTodasAsPaginas(listarVendas),
          listarClientes(),
        ]);
        if (cancelled) return;

        const clientesPorId = new Map(clientes.map(c => [c.id, c.nome]));

        const filtradas = todasVendas.filter(v => {
          const dataVenda = String(v.data).slice(0, 10);
          const dentroDoPeriodo = dataVenda >= filtroInicio && dataVenda <= filtroFim;
          const noCanal = !filtroCanal || v.canal === filtroCanal;
          return v.status === 'finalizada' && dentroDoPeriodo && noCanal;
        });

        // Itens por venda não vêm na listagem — busca detalhe por venda pra
        // contar SKUs. Aceitável nesta escala (loja pequena, período filtrado).
        const enriquecidas = await Promise.all(filtradas.map(async v => {
          const clienteNome = clientesPorId.get(v.cliente_id) ?? '—';
          try {
            const detalhe = await buscarVenda(v.id);
            return { ...v, clienteNome, qtdItens: detalhe.itens?.length ?? 0 };
          } catch {
            return { ...v, clienteNome, qtdItens: null };
          }
        }));

        if (cancelled) return;
        enriquecidas.sort((a, b) => new Date(b.data) - new Date(a.data));
        setVendas(enriquecidas);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filtroInicio, filtroFim, filtroCanal, dataInvalida]);

  const receitaTotal = useMemo(() => vendas.reduce((s, v) => s + Number(v.total), 0), [vendas]);
  const qtdVendas = vendas.length;
  const ticketMedio = qtdVendas > 0 ? receitaTotal / qtdVendas : 0;

  const receitaPorCanal = useMemo(() => {
    const mapa = new Map();
    for (const v of vendas) {
      mapa.set(v.canal, (mapa.get(v.canal) ?? 0) + Number(v.total));
    }
    return [...mapa.entries()]
      .map(([canal, total]) => ({ canal, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 2);
  }, [vendas]);

  const dadosGrafico = useMemo(() => {
    if (dataInvalida) return [];
    const dias = listarDiasNoPeriodo(filtroInicio, filtroFim);
    const receitaPorDia = new Map();
    for (const v of vendas) {
      const dia = String(v.data).slice(0, 10);
      receitaPorDia.set(dia, (receitaPorDia.get(dia) ?? 0) + Number(v.total));
    }
    return dias.map(dia => ({ dia, valor: receitaPorDia.get(dia) ?? 0 }));
  }, [vendas, filtroInicio, filtroFim, dataInvalida]);

  const maxGrafico = Math.max(1, ...dadosGrafico.map(d => d.valor));
  const skipLabel = Math.max(1, Math.ceil(dadosGrafico.length / 14));

  async function handleExportar() {
    setExportError('');
    setExportando(true);
    try {
      const periodoLabel = `Período: ${formatDateBR(filtroInicio)} a ${formatDateBR(filtroFim)}${filtroCanal ? ` · Canal: ${CANAL_LABEL[filtroCanal]}` : ''}`;
      await exportarRelatorioPDF({
        elementId: 'relatorio-vendas-container',
        filename: `Relatorio_Vendas_${todayISO()}.pdf`,
        titulo: 'Relatório de Vendas',
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
          <label className="input-label" htmlFor="rv-inicio">Data início</label>
          <input id="rv-inicio" type="date" className="input-field" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="rv-fim">Data fim</label>
          <input id="rv-fim" type="date" className="input-field" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="rv-canal">Canal</label>
          <select id="rv-canal" className="input-field" value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}>
            {CANAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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
        <div className="empty-state"><p className="text-sm text-secondary">Carregando relatório de vendas...</p></div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar o relatório de vendas</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && !dataInvalida && (
        <div id="relatorio-vendas-container">
          <div className="rel-kpis">
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Receita total</div>
              <div className="rel-kpi-value">{formatCurrency(receitaTotal)}</div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Quantidade de vendas</div>
              <div className="rel-kpi-value">{qtdVendas}</div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Ticket médio</div>
              <div className="rel-kpi-value">{formatCurrency(ticketMedio)}</div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Receita por canal</div>
              {receitaPorCanal.length === 0 ? (
                <div className="text-sm text-secondary">—</div>
              ) : (
                <div className="rel-kpi-badges">
                  {receitaPorCanal.map(c => (
                    <span key={c.canal} className="badge badge-primary">
                      {CANAL_LABEL[c.canal] ?? c.canal}: {formatCurrency(c.total)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card card-padding rel-chart-card">
            <div className="rel-chart-header">
              <h2 className="section-title">Receita por Dia</h2>
              <BarChart2 size={16} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            {dadosGrafico.length === 0 ? (
              <p className="text-sm text-secondary">Sem dados para o período.</p>
            ) : (
              <div className="rel-bar-chart">
                {dadosGrafico.map((d, i) => (
                  <div key={d.dia} className="rel-bar-wrap">
                    <div className="rel-bar-track">
                      <div
                        className="rel-bar-fill"
                        style={{ height: `${(d.valor / maxGrafico) * 100}%`, background: 'var(--color-primary)' }}
                        title={formatCurrency(d.valor)}
                      />
                    </div>
                    <div className="rel-bar-label">{i % skipLabel === 0 ? weekdayLabel(d.dia) : ''}</div>
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
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th>Subtotal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map(v => (
                  <tr key={v.id} className="rel-row">
                    <td>{formatDateBR(String(v.data).slice(0, 10))}</td>
                    <td>{v.clienteNome}</td>
                    <td>{v.qtdItens ?? '—'}</td>
                    <td className="rel-valor">{formatCurrency(v.total)}</td>
                    <td>
                      {v.forma_pagamento === 'a_vista'
                        ? <span className="badge badge-success">Pago</span>
                        : <span className="badge badge-warning">Pendente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vendas.length === 0 && (
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
