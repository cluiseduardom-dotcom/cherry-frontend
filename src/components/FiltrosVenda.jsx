import { ORDENACOES, FILTROS_PADRAO, validarFaixaDePreco } from '../utils/filtrosVitrine';

// Painel de filtros da vitrine do PDV: ordenar, só com estoque e faixa de preço.
// Controlado pela tela de venda; não faz chamadas à API.
export default function FiltrosVenda({ filtros, onChange, onLimpar, ativos }) {
  const erroFaixa = validarFaixaDePreco(filtros);

  function atualizar(campo, valor) {
    onChange({ ...filtros, [campo]: valor });
  }

  return (
    <div className="venda-filtros card" id="venda-filtros-painel" role="group" aria-label="Filtros dos produtos">
      <div className="venda-filtros-campo">
        <label className="input-label" htmlFor="venda-filtro-ordenar">Ordenar por</label>
        <select
          id="venda-filtro-ordenar"
          className="input-field"
          value={filtros.ordenar}
          onChange={e => atualizar('ordenar', e.target.value)}
        >
          {ORDENACOES.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
      </div>

      <label className="venda-filtros-check">
        <input
          type="checkbox"
          checked={filtros.somenteComEstoque}
          onChange={e => atualizar('somenteComEstoque', e.target.checked)}
        />
        Somente com estoque
      </label>

      <div className="venda-filtros-faixa">
        <div className="venda-filtros-campo">
          <label className="input-label" htmlFor="venda-filtro-min">Preço mínimo (R$)</label>
          <input
            id="venda-filtro-min"
            type="text"
            inputMode="decimal"
            className={`input-field${erroFaixa ? ' input-field--erro' : ''}`}
            placeholder="0,00"
            value={filtros.precoMin}
            onChange={e => atualizar('precoMin', e.target.value)}
          />
        </div>
        <div className="venda-filtros-campo">
          <label className="input-label" htmlFor="venda-filtro-max">Preço máximo (R$)</label>
          <input
            id="venda-filtro-max"
            type="text"
            inputMode="decimal"
            className={`input-field${erroFaixa ? ' input-field--erro' : ''}`}
            placeholder="sem limite"
            value={filtros.precoMax}
            onChange={e => atualizar('precoMax', e.target.value)}
          />
        </div>
      </div>
      {erroFaixa && <span className="campo-erro" role="alert">{erroFaixa}</span>}

      <div className="venda-filtros-acoes">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onLimpar} disabled={ativos === 0}>
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

export { FILTROS_PADRAO };
