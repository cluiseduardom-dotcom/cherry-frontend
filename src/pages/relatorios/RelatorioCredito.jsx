import { useState } from 'react';
import { obterRelatorioCredito } from '../../services/relatorios';
import { formatCurrency, todayISO } from './relatoriosUtils';
import { formatarPercentual } from '../../utils/relatoriosGestao';
import BarrasHorizontais from './BarrasHorizontais';
import EstadoRelatorio from './EstadoRelatorio';
import { useRelatorio } from './useRelatorio';

export default function RelatorioCredito() {
  const [dataRef, setDataRef] = useState(todayISO());
  const chave = dataRef || null;
  const { carregando, dados, erro } = useRelatorio(chave, () => obterRelatorioCredito({ data_ref: dataRef }));
  const comFiado = dados ? Object.prototype.hasOwnProperty.call(dados.totais, 'fiado') : false;

  return (
    <div>
      <div className="rel-filtros">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="rc-ref">Posição em</label>
          <input id="rc-ref" type="date" className="input-field" value={dataRef} onChange={e => setDataRef(e.target.value)} />
        </div>
      </div>

      <EstadoRelatorio carregando={carregando} erro={erro} nome="o relatório de crédito">
        {dados && (
          <>
            <div className="rel-kpis">
              <div className="card card-padding rel-kpi-card">
                <div className="rel-kpi-label">A receber</div>
                <div className="rel-kpi-value">{formatCurrency(dados.totais.contas_a_receber)}</div>
              </div>
              <div className="card card-padding rel-kpi-card">
                <div className="rel-kpi-label">Vencido</div>
                <div className={`rel-kpi-value${dados.totais.vencido > 0 ? ' rel-kpi-value--danger' : ''}`}>{formatCurrency(dados.totais.vencido)}</div>
              </div>
              <div className="card card-padding rel-kpi-card">
                <div className="rel-kpi-label">Inadimplência</div>
                <div className="rel-kpi-value">{formatarPercentual(dados.totais.inadimplencia_pct)}</div>
              </div>
              {comFiado && (
                <div className="card card-padding rel-kpi-card">
                  <div className="rel-kpi-label">Fiado em aberto</div>
                  <div className="rel-kpi-value">{formatCurrency(dados.totais.fiado)}</div>
                </div>
              )}
            </div>

            <div className="card card-padding">
              <h2 className="section-title">Por faixa de atraso</h2>
              <BarrasHorizontais
                formatar={formatCurrency}
                itens={dados.aging.map(f => ({ chave: f.faixa, rotulo: f.rotulo, valor: f.valor, detalhe: `${f.titulos} título(s)` }))}
              />
            </div>

            <div className="card rel-table-card">
              <div className="rel-table-title"><h2 className="section-title">Clientes com valores em aberto</h2></div>
              <div className="rel-table-scroll">
                <table className="rel-table">
                  <thead>
                    <tr><th>Cliente</th><th>Em aberto</th><th>Vencido</th><th>Maior atraso</th>{comFiado && <th>Fiado</th>}</tr>
                  </thead>
                  <tbody>
                    {dados.clientes.map(c => (
                      <tr key={c.cliente_id ?? 'sem-cliente'} className="rel-row">
                        <td>{c.nome}</td>
                        <td className="rel-valor">{formatCurrency(c.em_aberto)}</td>
                        <td>{formatCurrency(c.vencido)}</td>
                        <td>{c.maior_atraso_dias > 0 ? `${c.maior_atraso_dias} dias` : '—'}</td>
                        {comFiado && <td>{formatCurrency(c.fiado)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dados.clientes.length === 0 && (
                <div className="empty-state"><div className="empty-state-title">Nada a receber em aberto</div></div>
              )}
            </div>
            <p className="text-sm text-secondary rel-nota">
              Valores já descontam recebimentos parciais. Contas sem parcela (vendas antigas a prazo) entram pelo valor cheio.
            </p>
          </>
        )}
      </EstadoRelatorio>
    </div>
  );
}
