import { useEffect, useMemo, useState } from 'react';
import { indicadoresInsumos } from '../services/consumos';
import { formatarCusto } from '../utils/consumos';
import {
  PERIODOS_DIAS, selosDeReposicao, formatarCobertura, formatarMediaDiaria, ordenarPorUrgencia,
} from '../utils/indicadoresInsumos';
import '../pages/Compras.css';

export default function IndicadoresInsumos() {
  const [dias, setDias] = useState(90);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    indicadoresInsumos(dias)
      .then(d => { if (!cancelado) setDados(d); })
      .catch(err => { if (!cancelado) { setDados(null); setErro(err.message); } })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [dias]);

  function mudarPeriodo(valor) {
    setCarregando(true);
    setErro('');
    setDias(valor);
  }

  const temCusto = dados?.totais?.custo_consumo_periodo !== undefined;
  const t = dados?.totais;
  const insumos = useMemo(() => ordenarPorUrgencia(dados?.insumos), [dados]);

  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="input-wrapper" style={{ maxWidth: 240 }}>
          <label className="input-label" htmlFor="ind-dias">Período analisado</label>
          <select id="ind-dias" className="input-field" value={dias} onChange={e => mudarPeriodo(Number(e.target.value))}>
            {PERIODOS_DIAS.map(d => <option key={d} value={d}>Últimos {d} dias</option>)}
          </select>
        </div>
        <p className="text-sm text-secondary" style={{ marginTop: 8 }}>
          Só insumos ativos, com o saldo do Central. Consumo = vendas (sem devolução) + consumo avulso.
          Cobertura = saldo ÷ (consumo ÷ dias). Precisa repor: esgotado, saldo igual ou abaixo do mínimo, ou venda sem baixa por falta de insumo.
        </p>
      </div>
      {erro && <div className="modal-error" role="alert">{erro}</div>}
      {carregando && !dados && <p className="text-sm">Carregando…</p>}
      {t && (
        <>
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <ul style={{ display: 'grid', gap: 6, margin: 0, paddingLeft: 18 }}>
              <li><strong>{t.insumos_ativos}</strong> insumos ativos</li>
              <li><strong>{t.a_repor}</strong> precisam de reposição ({t.esgotados} esgotados, {t.abaixo_minimo} abaixo do mínimo, {t.com_pendencia} com venda sem baixa)</li>
              <li><strong>{t.consumo_total_periodo}</strong> unidades consumidas nos últimos {dados.dias} dias; {t.sem_consumo_no_periodo} insumos sem consumo no período</li>
              {temCusto && <li>Custo do consumo no período: <strong>{formatarCusto(t.custo_consumo_periodo)}</strong></li>}
            </ul>
          </div>
          {insumos.length === 0 ? (
            <div className="card" style={{ padding: 16 }}><p className="text-sm">Nenhum insumo ativo cadastrado.</p></div>
          ) : (
            <div className="card compras-table-wrap">
              <table className="compras-table">
                <thead>
                  <tr>
                    <th>Insumo</th><th>Saldo</th><th>Mínimo</th><th>Consumo no período</th><th>Média por dia</th>
                    <th>Cobertura</th><th>Situação</th><th>Comprar para sair do alerta</th>{temCusto && <th>Custo do consumo</th>}
                  </tr>
                </thead>
                <tbody>
                  {insumos.map(i => (
                    <tr key={i.id}>
                      <td>{i.sku ? `${i.sku} — ` : ''}{i.nome}</td>
                      <td>{i.saldo}</td>
                      <td>{i.estoque_minimo}</td>
                      <td>{i.consumo_periodo}</td>
                      <td>{formatarMediaDiaria(i.consumo_medio_diario)}</td>
                      <td>{formatarCobertura(i.cobertura_dias)}</td>
                      <td>
                        {selosDeReposicao(i).length === 0
                          ? <span className="badge badge-success">OK</span>
                          : selosDeReposicao(i).map(s => <span key={s.key} className={`badge ${s.tom}`} style={{ marginRight: 4 }}>{s.rotulo}</span>)}
                      </td>
                      <td>{i.para_atingir_minimo > 0 ? i.para_atingir_minimo : '—'}</td>
                      {temCusto && <td>{formatarCusto(i.custo_consumo_periodo) ?? '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
