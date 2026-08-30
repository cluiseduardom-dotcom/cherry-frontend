import { useEffect, useMemo, useState } from 'react';
import { Download, AlertTriangle, TrendingUp } from 'lucide-react';
import { listarContasReceber } from '../../services/contasReceber';
import { listarContasPagar } from '../../services/contasPagar';
import { listarVendas } from '../../services/vendas';
import { listarClientes } from '../../services/clientes';
import {
  formatCurrency,
  formatDateBR,
  todayISO,
  isoDaysFromToday,
  diasEmAberto,
  listarDiasNoPeriodo,
  buscarTodasAsPaginas,
  exportarRelatorioPDF,
} from './relatoriosUtils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'cancelado', label: 'Cancelado' },
];

const STATUS_LABEL_RECEBER = { pendente: 'Pendente', recebido: 'Pago', cancelado: 'Cancelado' };
const STATUS_BADGE_RECEBER = { pendente: 'badge-warning', recebido: 'badge-success', cancelado: 'badge-danger' };
const STATUS_LABEL_PAGAR = { pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado' };
const STATUS_BADGE_PAGAR = { pendente: 'badge-warning', pago: 'badge-success', cancelado: 'badge-danger' };

function diasEmAbertoLabel(dataVencimento) {
  const dias = diasEmAberto(dataVencimento);
  if (dias > 0) return `${dias} dias`;
  if (dias < 0) return `vence em ${-dias} dias`;
  return 'vence hoje';
}

export default function RelatorioFinanceiro() {
  const [filtroInicio, setFiltroInicio] = useState(isoDaysFromToday(-30));
  const [filtroFim, setFiltroFim] = useState(isoDaysFromToday(30));
  const [filtroStatus, setFiltroStatus] = useState('');

  const [resumoReceber, setResumoReceber] = useState([]);
  const [resumoPagar, setResumoPagar] = useState([]);
  const [nomeClientePorVendaId, setNomeClientePorVendaId] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');

  const dataInvalida = filtroInicio > filtroFim;

  useEffect(() => {
    if (dataInvalida) {
      setResumoReceber([]);
      setResumoPagar([]);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [receber, pagar] = await Promise.all([
          buscarTodasAsPaginas(params => listarContasReceber({ ...params, vencimentoDe: filtroInicio, vencimentoAte: filtroFim })),
          buscarTodasAsPaginas(params => listarContasPagar({ ...params, vencimentoDe: filtroInicio, vencimentoAte: filtroFim })),
        ]);
        if (!cancelled) {
          setResumoReceber(receber);
          setResumoPagar(pagar);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filtroInicio, filtroFim, dataInvalida]);

  // Contas a receber só guardam venda_id — resolve o nome do cliente
  // localmente juntando vendas + clientes (mesmo padrão de ContasReceber.jsx).
  useEffect(() => {
    let cancelled = false;

    async function loadClientes() {
      try {
        const [vendasData, clientesData] = await Promise.all([listarVendas(), listarClientes()]);
        if (cancelled) return;
        const nomePorClienteId = new Map(clientesData.map(c => [c.id, c.nome]));
        setNomeClientePorVendaId(new Map(vendasData.items.map(v => [v.id, nomePorClienteId.get(v.cliente_id) ?? ''])));
      } catch {
        // Extra sobre a tabela principal — se falhar, mostramos "—" no lugar do nome.
      }
    }

    loadClientes();
    return () => { cancelled = true; };
  }, []);

  const contasReceber = useMemo(() => {
    if (!filtroStatus) return resumoReceber;
    const statusBackend = filtroStatus === 'pago' ? 'recebido' : filtroStatus;
    return resumoReceber.filter(c => c.status === statusBackend);
  }, [resumoReceber, filtroStatus]);

  const contasPagar = useMemo(() => {
    if (!filtroStatus) return resumoPagar;
    return resumoPagar.filter(c => c.status === filtroStatus);
  }, [resumoPagar, filtroStatus]);

  const saldoAReceber = useMemo(
    () => resumoReceber.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0),
    [resumoReceber]
  );
  const saldoAPagar = useMemo(
    () => resumoPagar.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0),
    [resumoPagar]
  );
  const fluxoLiquido = saldoAReceber - saldoAPagar;
  const inadimplencia = useMemo(
    () => resumoReceber.filter(c => c.status === 'pendente' && c.atrasado).length,
    [resumoReceber]
  );

  const dadosGrafico = useMemo(() => {
    if (dataInvalida) return null;
    const dias = listarDiasNoPeriodo(filtroInicio, filtroFim);

    function serieCumulativa(lista) {
      const porDia = new Map(dias.map(d => [d, 0]));
      for (const c of lista) {
        const dia = String(c.data_vencimento).slice(0, 10);
        if (porDia.has(dia)) porDia.set(dia, porDia.get(dia) + Number(c.valor));
      }
      let acumulado = 0;
      return dias.map(d => { acumulado += porDia.get(d); return acumulado; });
    }

    const receber = serieCumulativa(resumoReceber);
    const pagar = serieCumulativa(resumoPagar);
    const maxValor = Math.max(1, ...receber, ...pagar);

    return { dias, receber, pagar, maxValor };
  }, [resumoReceber, resumoPagar, filtroInicio, filtroFim, dataInvalida]);

  function toPoints(valores, maxValor, w, h) {
    const n = valores.length;
    return valores
      .map((v, i) => `${n > 1 ? (i / (n - 1)) * w : w / 2},${h - (v / maxValor) * h}`)
      .join(' ');
  }

  async function handleExportar() {
    setExportError('');
    setExportando(true);
    try {
      const statusLabel = STATUS_OPTIONS.find(o => o.value === filtroStatus)?.label ?? 'Todos';
      const periodoLabel = `Vencimento: ${formatDateBR(filtroInicio)} a ${formatDateBR(filtroFim)} · Status: ${statusLabel}`;
      await exportarRelatorioPDF({
        elementId: 'relatorio-financeiro-container',
        filename: `Relatorio_Financeiro_${todayISO()}.pdf`,
        titulo: 'Relatório Financeiro',
        periodoLabel,
      });
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportando(false);
    }
  }

  const chartW = 600;
  const chartH = 180;

  return (
    <div>
      <div className="rel-filtros">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="rf-inicio">Vencimento início</label>
          <input id="rf-inicio" type="date" className="input-field" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="rf-fim">Vencimento fim</label>
          <input id="rf-fim" type="date" className="input-field" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="rf-status">Status</label>
          <select id="rf-status" className="input-field" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
        <div className="empty-state"><p className="text-sm text-secondary">Carregando relatório financeiro...</p></div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar o relatório financeiro</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && !dataInvalida && (
        <div id="relatorio-financeiro-container">
          <div className="rel-kpis">
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Saldo a receber</div>
              <div className="rel-kpi-value rel-kpi-value--success">{formatCurrency(saldoAReceber)}</div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Saldo a pagar</div>
              <div className="rel-kpi-value rel-kpi-value--danger">{formatCurrency(saldoAPagar)}</div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Fluxo líquido</div>
              <div className={`rel-kpi-value ${fluxoLiquido < 0 ? 'rel-kpi-value--danger' : 'rel-kpi-value--success'}`}>
                {formatCurrency(fluxoLiquido)}
              </div>
            </div>
            <div className="card card-padding rel-kpi-card">
              <div className="rel-kpi-label">Inadimplência</div>
              <div className="rel-kpi-value rel-kpi-value--danger">{inadimplencia}</div>
            </div>
          </div>

          <div className="card card-padding rel-chart-card">
            <div className="rel-chart-header">
              <h2 className="section-title">Saldo Cumulativo — Receber x Pagar</h2>
              <TrendingUp size={16} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div className="rel-chart-legend">
              <span><span className="rel-legend-dot" style={{ background: 'var(--color-success)' }} /> A receber</span>
              <span><span className="rel-legend-dot" style={{ background: 'var(--color-danger)' }} /> A pagar</span>
            </div>
            {dadosGrafico && dadosGrafico.dias.length > 1 ? (
              <svg className="rel-line-chart" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                <polyline points={toPoints(dadosGrafico.pagar, dadosGrafico.maxValor, chartW, chartH)} fill="none" stroke="var(--color-danger)" strokeWidth="2.5" />
                <polyline points={toPoints(dadosGrafico.receber, dadosGrafico.maxValor, chartW, chartH)} fill="none" stroke="var(--color-success)" strokeWidth="2.5" />
              </svg>
            ) : (
              <p className="text-sm text-secondary">Sem dados suficientes para o gráfico no período.</p>
            )}
            {dadosGrafico && dadosGrafico.dias.length > 1 && (
              <div className="rel-line-chart-labels">
                <span>{formatDateBR(dadosGrafico.dias[0])}</span>
                <span>{formatDateBR(dadosGrafico.dias[dadosGrafico.dias.length - 1])}</span>
              </div>
            )}
          </div>

          <div className="rel-financeiro-tables">
            <div className="card rel-table-card">
              <div className="rel-table-title">Contas a Receber</div>
              <table className="rel-table">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Dias em aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {contasReceber.map(c => (
                    <tr key={c.id} className="rel-row">
                      <td>{formatDateBR(c.data_vencimento)}</td>
                      <td>{nomeClientePorVendaId.get(c.venda_id) || '—'}</td>
                      <td className="rel-valor">{formatCurrency(c.valor)}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE_RECEBER[c.status]}`}>{STATUS_LABEL_RECEBER[c.status]}</span>
                        {c.atrasado && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Atrasado</span>}
                      </td>
                      <td>{diasEmAbertoLabel(c.data_vencimento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contasReceber.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">Nenhum registro encontrado para os filtros selecionados</div>
                </div>
              )}
            </div>

            <div className="card rel-table-card">
              <div className="rel-table-title">Contas a Pagar</div>
              <table className="rel-table">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Fornecedor</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Dias em aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {contasPagar.map(c => (
                    <tr key={c.id} className="rel-row">
                      <td>{formatDateBR(c.data_vencimento)}</td>
                      <td>{c.fornecedor || '—'}</td>
                      <td className="rel-valor">{formatCurrency(c.valor)}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE_PAGAR[c.status]}`}>{STATUS_LABEL_PAGAR[c.status]}</span>
                        {c.atrasado && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Atrasado</span>}
                      </td>
                      <td>{diasEmAbertoLabel(c.data_vencimento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contasPagar.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">Nenhum registro encontrado para os filtros selecionados</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
