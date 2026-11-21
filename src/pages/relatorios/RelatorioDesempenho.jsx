import { useState } from 'react';
import { obterDesempenhoVendedores } from '../../services/relatorios';
import { formatCurrency, isoDaysFromToday, todayISO } from './relatoriosUtils';
import { formatarPercentual, temCusto, validarPeriodo } from '../../utils/relatoriosGestao';
import EstadoRelatorio from './EstadoRelatorio';
import FiltroPeriodo from './FiltroPeriodo';
import { useRelatorio } from './useRelatorio';

export default function RelatorioDesempenho() {
  const [periodo, setPeriodo] = useState({ inicio: isoDaysFromToday(-29), fim: todayISO() });
  const erroPeriodo = validarPeriodo(periodo.inicio, periodo.fim);
  const chave = erroPeriodo ? null : `${periodo.inicio}|${periodo.fim}`;
  const { carregando, dados, erro } = useRelatorio(chave, () => obterDesempenhoVendedores({ data_de: periodo.inicio, data_ate: periodo.fim }));
  const comCusto = temCusto(dados?.vendedores?.[0]);

  return (
    <div>
      <FiltroPeriodo idBase="rd" inicio={periodo.inicio} fim={periodo.fim} onChange={setPeriodo} erro={erroPeriodo} />

      {!erroPeriodo && (
        <EstadoRelatorio carregando={carregando} erro={erro} nome="o desempenho da equipe">
          {dados && (
            <>
              <div className="rel-kpis">
                <div className="card card-padding rel-kpi-card">
                  <div className="rel-kpi-label">Receita da equipe</div>
                  <div className="rel-kpi-value">{formatCurrency(dados.totais.receita)}</div>
                </div>
                <div className="card card-padding rel-kpi-card">
                  <div className="rel-kpi-label">Vendas</div>
                  <div className="rel-kpi-value">{dados.totais.vendas}</div>
                </div>
                <div className="card card-padding rel-kpi-card">
                  <div className="rel-kpi-label">Vendedores com venda</div>
                  <div className="rel-kpi-value">{dados.vendedores.length}</div>
                </div>
              </div>

              <div className="card rel-table-card">
                <div className="rel-table-scroll">
                  <table className="rel-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Vendedor</th>
                        <th>Vendas</th>
                        <th>Receita</th>
                        <th>Participação</th>
                        <th>Ticket médio</th>
                        <th>Itens/venda</th>
                        <th>Comissão</th>
                        <th>Canceladas</th>
                        {comCusto && <th>Margem bruta</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dados.vendedores.map(v => (
                        <tr key={v.usuario_id ?? v.nome} className="rel-row">
                          <td>{v.posicao}</td>
                          <td>{v.nome}</td>
                          <td>{v.vendas}</td>
                          <td className="rel-valor">{formatCurrency(v.receita)}</td>
                          <td>{formatarPercentual(v.participacao_pct)}</td>
                          <td>{v.ticket_medio === null ? '—' : formatCurrency(v.ticket_medio)}</td>
                          <td>{v.itens_por_venda ?? '—'}</td>
                          <td>{formatCurrency(v.comissao)}</td>
                          <td>{v.canceladas}</td>
                          {comCusto && <td>{formatarPercentual(v.margem_bruta_pct)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {dados.vendedores.length === 0 && (
                  <div className="empty-state"><div className="empty-state-title">Nenhuma venda no período</div></div>
                )}
              </div>
            </>
          )}
        </EstadoRelatorio>
      )}
    </div>
  );
}
