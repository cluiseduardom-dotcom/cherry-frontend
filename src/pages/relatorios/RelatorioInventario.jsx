import { useState } from 'react';
import { obterInventario } from '../../services/relatorios';
import { formatCurrency } from './relatoriosUtils';
import EstadoRelatorio from './EstadoRelatorio';
import { useRelatorio } from './useRelatorio';

const TIPOS = [
  { value: 'produto', label: 'Produtos' },
  { value: 'insumo', label: 'Insumos' },
];
const POR_PAGINA = 50;

export default function RelatorioInventario() {
  const [tipo, setTipo] = useState('produto');
  const [localId, setLocalId] = useState('');
  const [somenteComSaldo, setSomenteComSaldo] = useState(true);
  const [pagina, setPagina] = useState(1);

  const chave = `${tipo}|${localId}|${somenteComSaldo}|${pagina}`;
  const { carregando, dados, erro } = useRelatorio(chave, () =>
    obterInventario({
      tipo,
      local_id: localId || undefined,
      somente_com_saldo: somenteComSaldo,
      page: pagina,
      pageSize: POR_PAGINA,
    })
  );
  const comValor = dados ? Object.prototype.hasOwnProperty.call(dados.totais, 'valor_custo') : false;

  // Qualquer mudança de filtro volta para a primeira página.
  const mudar = setter => valor => {
    setter(valor);
    setPagina(1);
  };

  return (
    <div>
      <div className="rel-filtros">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="ri-tipo">Tipo</label>
          <select id="ri-tipo" className="input-field" value={tipo} onChange={e => { mudar(setTipo)(e.target.value); setLocalId(''); }}>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="ri-local">Local</label>
          <select id="ri-local" className="input-field" value={localId} onChange={e => mudar(setLocalId)(e.target.value)}>
            <option value="">Todos (saldo total)</option>
            {(dados?.por_local ?? []).map(l => <option key={l.local_id} value={l.local_id}>{l.nome}</option>)}
          </select>
        </div>
        <label className="rel-checkbox">
          <input type="checkbox" checked={somenteComSaldo} onChange={e => mudar(setSomenteComSaldo)(e.target.checked)} />
          Só com saldo
        </label>
      </div>

      <EstadoRelatorio carregando={carregando} erro={erro} nome="o inventário">
        {dados && (
          <>
            <div className="rel-kpis">
              <div className="card card-padding rel-kpi-card">
                <div className="rel-kpi-label">Itens</div>
                <div className="rel-kpi-value">{dados.totais.produtos}</div>
              </div>
              <div className="card card-padding rel-kpi-card">
                <div className="rel-kpi-label">Unidades</div>
                <div className="rel-kpi-value">{dados.totais.unidades}</div>
              </div>
              {comValor && (
                <div className="card card-padding rel-kpi-card">
                  <div className="rel-kpi-label">Valor em custo</div>
                  <div className="rel-kpi-value">{formatCurrency(dados.totais.valor_custo)}</div>
                </div>
              )}
              <div className="card card-padding rel-kpi-card">
                <div className="rel-kpi-label">Abaixo do mínimo</div>
                <div className={`rel-kpi-value${dados.totais.abaixo_minimo > 0 ? ' rel-kpi-value--danger' : ''}`}>{dados.totais.abaixo_minimo}</div>
              </div>
            </div>

            {!dados.local && (
              <div className="card rel-table-card">
                <div className="rel-table-title"><h2 className="section-title">Por local</h2></div>
                <div className="rel-table-scroll">
                  <table className="rel-table">
                    <thead><tr><th>Local</th><th>Tipo</th><th>Itens</th><th>Unidades</th>{comValor && <th>Valor em custo</th>}</tr></thead>
                    <tbody>
                      {dados.por_local.map(l => (
                        <tr key={l.local_id} className="rel-row">
                          <td>{l.nome}</td>
                          <td>{l.tipo}</td>
                          <td>{l.produtos}</td>
                          <td>{l.unidades}</td>
                          {comValor && <td className="rel-valor">{formatCurrency(l.valor_custo)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card rel-table-card">
              <div className="rel-table-title"><h2 className="section-title">{dados.local ? `Saldo em ${dados.local.nome}` : 'Posição de estoque'}</h2></div>
              <div className="rel-table-scroll">
                <table className="rel-table">
                  <thead>
                    <tr>
                      <th>Item</th><th>SKU</th><th>Saldo</th><th>Mínimo</th>
                      {comValor && <><th>Custo unit.</th><th>Valor em custo</th></>}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.items.map(i => (
                      <tr key={i.produto_id} className={`rel-row${i.abaixo_minimo ? ' rel-row--baixo-estoque' : ''}`}>
                        <td>{i.nome}{!i.ativo && <span className="badge badge-info rel-badge-inativo">Inativo</span>}</td>
                        <td>{i.sku ?? '—'}</td>
                        <td>{i.saldo} {i.unidade ?? ''}</td>
                        <td>{i.estoque_minimo > 0 ? i.estoque_minimo : '—'}</td>
                        {comValor && <><td>{formatCurrency(i.custo_unitario)}</td><td className="rel-valor">{formatCurrency(i.valor_custo)}</td></>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dados.items.length === 0 && (
                <div className="empty-state"><div className="empty-state-title">Nenhum item para os filtros selecionados</div></div>
              )}
              {dados.totalPages > 1 && (
                <div className="rel-paginacao">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
                  <span className="text-sm text-secondary">Página {dados.page} de {dados.totalPages}</span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={pagina >= dados.totalPages} onClick={() => setPagina(pagina + 1)}>Próxima</button>
                </div>
              )}
            </div>
          </>
        )}
      </EstadoRelatorio>
    </div>
  );
}
