import { useState } from 'react';
import { obterRelatorioProdutos } from '../../services/relatorios';
import { formatCurrency, formatDateBR, isoDaysFromToday, todayISO } from './relatoriosUtils';
import { ROTULOS_CURVA, descreverCobertura, formatarPercentual, temCusto, validarPeriodo } from '../../utils/relatoriosGestao';
import EstadoRelatorio from './EstadoRelatorio';
import FiltroPeriodo from './FiltroPeriodo';
import { useRelatorio } from './useRelatorio';

const CURVA_BADGE = { A: 'badge-success', B: 'badge-warning', C: 'badge-info' };
const ORDENS = [
  { value: 'receita', label: 'Receita' },
  { value: 'quantidade', label: 'Quantidade' },
  { value: 'margem', label: 'Margem' },
];

export default function RelatorioProdutos() {
  const [periodo, setPeriodo] = useState({ inicio: isoDaysFromToday(-29), fim: todayISO() });
  const [ordem, setOrdem] = useState('receita');
  const erroPeriodo = validarPeriodo(periodo.inicio, periodo.fim);
  const chave = erroPeriodo ? null : `${periodo.inicio}|${periodo.fim}|${ordem}`;
  const { carregando, dados, erro } = useRelatorio(chave, () =>
    obterRelatorioProdutos({ data_de: periodo.inicio, data_ate: periodo.fim, ordem, limite: 100 })
  );
  const comCusto = temCusto(dados?.produtos?.[0]);

  return (
    <div>
      <FiltroPeriodo idBase="rp" inicio={periodo.inicio} fim={periodo.fim} onChange={setPeriodo} erro={erroPeriodo}>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="rp-ordem">Ordenar por</label>
          <select id="rp-ordem" className="input-field" value={ordem} onChange={e => setOrdem(e.target.value)}>
            {ORDENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </FiltroPeriodo>

      {!erroPeriodo && (
        <EstadoRelatorio carregando={carregando} erro={erro} nome="o relatório de produtos">
          {dados && (
            <>
              {ordem === 'margem' && dados.ordem !== 'margem' && (
                <p className="text-sm text-secondary rel-nota">Ordenar por margem exige permissão para ver custos; a lista está ordenada por receita.</p>
              )}

              <div className="rel-kpis">
                <div className="card card-padding rel-kpi-card">
                  <div className="rel-kpi-label">Produtos vendidos</div>
                  <div className="rel-kpi-value">{dados.totais.produtos_vendidos}</div>
                </div>
                <div className="card card-padding rel-kpi-card">
                  <div className="rel-kpi-label">Unidades vendidas</div>
                  <div className="rel-kpi-value">{dados.totais.quantidade}</div>
                </div>
                <div className="card card-padding rel-kpi-card">
                  <div className="rel-kpi-label">Produtos parados com estoque</div>
                  <div className="rel-kpi-value">{dados.sem_venda.produtos}</div>
                  {dados.sem_venda.valor_custo !== undefined && (
                    <span className="text-sm text-secondary">{formatCurrency(dados.sem_venda.valor_custo)} em custo</span>
                  )}
                </div>
              </div>

              <div className="card rel-table-card">
                <div className="rel-table-title"><h2 className="section-title">Mais vendidos</h2></div>
                <div className="rel-table-scroll">
                  <table className="rel-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>Qtd.</th>
                        <th>Receita</th>
                        {comCusto && <th>Margem bruta</th>}
                        <th title={Object.values(ROTULOS_CURVA).join(' · ')}>Curva</th>
                        <th>Estoque</th>
                        <th>Cobertura</th>
                        <th>Última venda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.produtos.map(p => (
                        <tr key={p.produto_id} className="rel-row">
                          <td>{p.nome}</td>
                          <td>{p.sku ?? '—'}</td>
                          <td>{p.quantidade}</td>
                          <td className="rel-valor">{formatCurrency(p.receita)}</td>
                          {comCusto && <td>{formatarPercentual(p.margem_bruta_pct)}</td>}
                          <td><span className={`badge ${CURVA_BADGE[p.curva] ?? ''}`}>{p.curva}</span></td>
                          <td>{p.estoque_atual}</td>
                          <td>{descreverCobertura(p.cobertura_dias)}</td>
                          <td>{formatDateBR(p.ultima_venda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {dados.produtos.length === 0 && (
                  <div className="empty-state"><div className="empty-state-title">Nenhuma venda no período</div></div>
                )}
              </div>
              <p className="text-sm text-secondary rel-nota">
                Receita por produto usa o preço de tabela do item; o desconto dado na venda não é dividido entre os itens. A curva ABC considera todos os produtos vendidos no período.
              </p>

              <div className="card rel-table-card">
                <div className="rel-table-title"><h2 className="section-title">Capital parado: sem venda no período</h2></div>
                <div className="rel-table-scroll">
                  <table className="rel-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>Estoque</th>
                        {dados.sem_venda.valor_custo !== undefined && <th>Valor em custo</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dados.sem_venda.itens.map(p => (
                        <tr key={p.produto_id} className="rel-row">
                          <td>{p.nome}</td>
                          <td>{p.sku ?? '—'}</td>
                          <td>{p.estoque_atual}</td>
                          {p.valor_custo !== undefined && <td className="rel-valor">{formatCurrency(p.valor_custo)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {dados.sem_venda.itens.length === 0 && (
                  <div className="empty-state"><div className="empty-state-title">Todo produto com estoque vendeu no período</div></div>
                )}
              </div>
            </>
          )}
        </EstadoRelatorio>
      )}
    </div>
  );
}
