import './SimulacaoPontoEquilibrio.css';

export default function SimulacaoPontoEquilibrio({
  ativo,
  custoFixo,
  margem,
  receita,
  onChangeCustoFixo,
  onChangeMargem,
  onChangeReceita,
  onAtivar,
  onDesativar,
  onRestaurar
}) {
  return (
    <div className="pe-simulacao">
      <label className="pe-simulacao-toggle">
        <input
          type="checkbox"
          checked={ativo}
          onChange={e => (e.target.checked ? onAtivar() : onDesativar())}
        />
        Simular cenário
      </label>

      {ativo && (
        <div className="pe-simulacao-form">
          <span className="badge badge-warning pe-simulacao-badge">Simulação — não é dado real</span>

          <div className="input-wrapper">
            <label className="input-label" htmlFor="pe-sim-custo-fixo">Custo fixo total (R$)</label>
            <input
              id="pe-sim-custo-fixo"
              type="number"
              step="0.01"
              className="input-field"
              value={custoFixo}
              onChange={e => onChangeCustoFixo(e.target.value)}
            />
          </div>

          <div className="input-wrapper">
            <label className="input-label" htmlFor="pe-sim-margem">Margem de contribuição (%)</label>
            <input
              id="pe-sim-margem"
              type="number"
              step="0.01"
              className="input-field"
              value={margem}
              onChange={e => onChangeMargem(e.target.value)}
            />
          </div>

          <div className="input-wrapper">
            <label className="input-label" htmlFor="pe-sim-receita">Receita (R$)</label>
            <input
              id="pe-sim-receita"
              type="number"
              step="0.01"
              className="input-field"
              value={receita}
              onChange={e => onChangeReceita(e.target.value)}
            />
          </div>

          <button type="button" className="btn btn-ghost" onClick={onRestaurar}>
            Restaurar valores reais
          </button>
        </div>
      )}
    </div>
  );
}
