import { useState } from 'react';
import { obterAnaliseVendas } from '../../services/relatorios';
import { formatCurrency, isoDaysFromToday, todayISO } from './relatoriosUtils';
import {
  contarVendas,
  descreverVariacao,
  formatarPercentual,
  rotuloDiaSemana,
  rotuloFormaPagamento,
  temCusto,
  validarPeriodo,
} from '../../utils/relatoriosGestao';
import BarrasHorizontais from './BarrasHorizontais';
import EstadoRelatorio from './EstadoRelatorio';
import FiltroPeriodo from './FiltroPeriodo';
import { useRelatorio } from './useRelatorio';

function Variacao({ pct }) {
  const { texto, tom } = descreverVariacao(pct);
  return <span className={`rel-variacao rel-variacao--${tom}`} title="Em relação ao período anterior, de mesmo tamanho">{texto}</span>;
}

function Kpi({ rotulo, valor, variacao }) {
  return (
    <div className="card card-padding rel-kpi-card">
      <div className="rel-kpi-label">{rotulo}</div>
      <div className="rel-kpi-value">{valor}</div>
      {variacao !== undefined && <Variacao pct={variacao} />}
    </div>
  );
}

export default function RelatorioAnaliseVendas() {
  const [periodo, setPeriodo] = useState({ inicio: isoDaysFromToday(-29), fim: todayISO() });
  const erroPeriodo = validarPeriodo(periodo.inicio, periodo.fim);
  const chave = erroPeriodo ? null : `${periodo.inicio}|${periodo.fim}`;
  const { carregando, dados, erro } = useRelatorio(chave, () => obterAnaliseVendas({ data_de: periodo.inicio, data_ate: periodo.fim }));

  return (
    <div>
      <FiltroPeriodo idBase="rav" inicio={periodo.inicio} fim={periodo.fim} onChange={setPeriodo} erro={erroPeriodo} />

      {!erroPeriodo && (
        <EstadoRelatorio carregando={carregando} erro={erro} nome="a análise de vendas">
          {dados && (
            <>
              <div className="rel-kpis">
                <Kpi rotulo="Receita" valor={formatCurrency(dados.totais.receita)} variacao={dados.comparativo.receita.variacao_pct} />
                <Kpi rotulo="Vendas" valor={dados.totais.vendas} variacao={dados.comparativo.vendas.variacao_pct} />
                <Kpi rotulo="Ticket médio" valor={dados.totais.ticket_medio === null ? '—' : formatCurrency(dados.totais.ticket_medio)} variacao={dados.comparativo.ticket_medio.variacao_pct} />
                {temCusto(dados.totais) && <Kpi rotulo="Margem bruta" valor={formatarPercentual(dados.totais.margem_bruta_pct)} />}
              </div>

              <p className="text-sm text-secondary rel-nota">
                Comparado com o período anterior de {dados.periodo.dias} dias. Vendas canceladas no período: {dados.canceladas.vendas} ({formatCurrency(dados.canceladas.valor)}), fora da receita.
              </p>

              <div className="rel-grid-2">
                <div className="card card-padding">
                  <h2 className="section-title">Por canal</h2>
                  <BarrasHorizontais
                    formatar={formatCurrency}
                    itens={dados.por_canal.map(c => ({
                      chave: String(c.canal_id ?? c.nome),
                      rotulo: c.nome,
                      valor: c.receita,
                      detalhe: `${contarVendas(c.vendas)} · ticket ${c.ticket_medio === null ? '—' : formatCurrency(c.ticket_medio)} · ${formatarPercentual(c.participacao_pct)} da receita`,
                    }))}
                  />
                </div>
                <div className="card card-padding">
                  <h2 className="section-title">Por forma de pagamento</h2>
                  <BarrasHorizontais
                    formatar={formatCurrency}
                    itens={dados.por_forma_pagamento.map(f => ({
                      chave: f.forma_pagamento,
                      rotulo: rotuloFormaPagamento(f.forma_pagamento),
                      valor: f.valor,
                      detalhe: contarVendas(f.vendas),
                    }))}
                  />
                </div>
                <div className="card card-padding">
                  <h2 className="section-title">Por dia da semana</h2>
                  <BarrasHorizontais
                    formatar={formatCurrency}
                    itens={dados.por_dia_semana.map(d => ({
                      chave: String(d.dia_semana),
                      rotulo: rotuloDiaSemana(d.dia_semana),
                      valor: d.receita,
                      detalhe: contarVendas(d.vendas),
                    }))}
                  />
                </div>
                <div className="card rel-table-card">
                  <div className="rel-table-title"><h2 className="section-title">Melhores clientes</h2></div>
                  <div className="rel-table-scroll">
                    <table className="rel-table">
                      <thead><tr><th>Cliente</th><th>Vendas</th><th>Receita</th></tr></thead>
                      <tbody>
                        {dados.top_clientes.map(c => (
                          <tr key={c.cliente_id} className="rel-row">
                            <td>{c.nome}</td>
                            <td>{c.vendas}</td>
                            <td className="rel-valor">{formatCurrency(c.receita)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {dados.top_clientes.length === 0 && <p className="text-sm text-secondary rel-vazio">Nenhuma venda com cliente identificado no período.</p>}
                </div>
              </div>
            </>
          )}
        </EstadoRelatorio>
      )}
    </div>
  );
}
