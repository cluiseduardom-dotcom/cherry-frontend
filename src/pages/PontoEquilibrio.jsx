import { useEffect, useState } from 'react';
import { TrendingUp, PiggyBank, Wallet, Target, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calcularPontoEquilibrio } from '../services/pontoEquilibrio';
import './PontoEquilibrio.css';

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(2)}%`;
}

export default function PontoEquilibrio() {
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  async function load(params) {
    setLoading(true);
    setError('');
    try {
      const data = await calcularPontoEquilibrio(params);
      setResultado(data);
      setDataInicio(data.periodo.inicio);
      setDataFim(data.periodo.fim);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAplicarPeriodo(e) {
    e.preventDefault();
    load({ dataInicio, dataFim });
  }

  function handleMesAtual() {
    load({});
  }

  const metaBatida = resultado && !resultado.inviavel && resultado.faltaParaAtingir === 0 && resultado.receita > 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ponto de Equilíbrio</h1>
          <p className="page-subtitle">Quanto a empresa precisa faturar no período pra cobrir custos fixos e variáveis</p>
        </div>
        <Link to="/despesas-fixas" className="btn btn-secondary">
          <Settings2 size={16} />
          Despesas Fixas
        </Link>
      </div>

      <form className="pe-periodo-form" onSubmit={handleAplicarPeriodo}>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="pe-inicio">De</label>
          <input
            id="pe-inicio"
            type="date"
            className="input-field"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
          />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="pe-fim">Até</label>
          <input
            id="pe-fim"
            type="date"
            className="input-field"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">Aplicar</button>
        <button type="button" className="btn btn-ghost" onClick={handleMesAtual}>Mês atual</button>
      </form>

      {loading && (
        <div className="empty-state">
          <p className="text-sm text-secondary">Calculando ponto de equilíbrio...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível calcular o ponto de equilíbrio</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && resultado && (
        <>
          <div className="pe-stats-grid">
            <div className="card card-padding pe-stat-card">
              <div className="pe-stat-icon"><TrendingUp size={18} strokeWidth={2} /></div>
              <div className="pe-stat-value">{formatCurrency(resultado.receita)}</div>
              <div className="pe-stat-label">Receita do período</div>
            </div>

            <div className="card card-padding pe-stat-card">
              <div className="pe-stat-icon"><PiggyBank size={18} strokeWidth={2} /></div>
              <div className="pe-stat-value">{formatPercent(resultado.margemContribuicao)}</div>
              <div className="pe-stat-label">Margem de contribuição</div>
            </div>

            <div className="card card-padding pe-stat-card">
              <div className="pe-stat-icon"><Wallet size={18} strokeWidth={2} /></div>
              <div className="pe-stat-value">{formatCurrency(resultado.custoFixoTotal)}</div>
              <div className="pe-stat-label">Custo fixo total</div>
            </div>
          </div>

          <div className={`card card-padding pe-highlight ${resultado.inviavel ? 'pe-highlight--inviavel' : ''}`}>
            <div className="pe-highlight-icon"><Target size={28} strokeWidth={2} /></div>
            <div className="pe-highlight-info">
              <div className="pe-highlight-label">Ponto de Equilíbrio</div>
              <div className="pe-highlight-value">
                {resultado.inviavel ? 'Inviável no período' : formatCurrency(resultado.pontoEquilibrio)}
              </div>
              {resultado.inviavel ? (
                <p className="text-sm text-secondary pe-highlight-sub">
                  A margem de contribuição está zerada ou negativa: o custo variável (produtos + impostos) supera a receita do período.
                </p>
              ) : metaBatida ? (
                <p className="pe-highlight-sub pe-highlight-sub--success">Meta batida ✅</p>
              ) : (
                <p className="text-sm text-secondary pe-highlight-sub">
                  Falta {formatCurrency(resultado.faltaParaAtingir)} para bater o ponto de equilíbrio no período.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
