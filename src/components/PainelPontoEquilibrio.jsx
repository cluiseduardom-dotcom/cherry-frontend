import { TrendingUp, PiggyBank, Wallet, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import GraficoPontoEquilibrio from './GraficoPontoEquilibrio';
import './PainelPontoEquilibrio.css';

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(2)}%`;
}

function DeltaIndicador({ delta, formatar }) {
  if (!delta || delta.atual == null || delta.anterior == null) return null;

  const { atual, anterior, maiorEMelhor } = delta;
  const diferenca = atual - anterior;
  const semVariacao = Math.abs(diferenca) < 0.005;
  const subiu = diferenca > 0;
  const favoravel = semVariacao ? null : maiorEMelhor ? subiu : !subiu;
  const percentual = anterior !== 0 ? (Math.abs(diferenca) / Math.abs(anterior)) * 100 : null;

  const classeCor = semVariacao
    ? 'pe-delta--neutro'
    : favoravel
      ? 'pe-delta--positivo'
      : 'pe-delta--negativo';
  const seta = semVariacao ? '•' : subiu ? '↑' : '↓';
  const texto = percentual != null ? `${percentual.toFixed(1)}%` : formatar(Math.abs(diferenca));

  return (
    <span className={`pe-delta ${classeCor}`} title={`Período B: ${formatar(anterior)}`}>
      {seta} {texto}
    </span>
  );
}

export default function PainelPontoEquilibrio({ resultado, loading, error, deltas }) {
  const metaBatida = resultado && !resultado.semDespesasFixas && !resultado.inviavel && resultado.faltaParaAtingir === 0 && resultado.receita > 0;

  if (loading) {
    return (
      <div className="empty-state">
        <p className="text-sm text-secondary">Calculando ponto de equilíbrio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Não foi possível calcular o ponto de equilíbrio</div>
        <p className="text-sm text-secondary">{error}</p>
      </div>
    );
  }

  if (!resultado) return null;

  return (
    <>
      <div className="pe-stats-grid">
        <div className="card card-padding pe-stat-card">
          <div className="pe-stat-icon"><TrendingUp size={18} strokeWidth={2} /></div>
          <div className="pe-stat-value">{formatCurrency(resultado.receita)}</div>
          <div className="pe-stat-label">Receita do período</div>
          <DeltaIndicador delta={deltas?.receita} formatar={formatCurrency} />
        </div>

        <div className="card card-padding pe-stat-card">
          <div className="pe-stat-icon"><PiggyBank size={18} strokeWidth={2} /></div>
          <div className="pe-stat-value">{formatPercent(resultado.margemContribuicao)}</div>
          <div className="pe-stat-label">Margem de contribuição</div>
          <DeltaIndicador delta={deltas?.margemContribuicao} formatar={formatPercent} />
        </div>

        <div className="card card-padding pe-stat-card">
          <div className="pe-stat-icon"><Wallet size={18} strokeWidth={2} /></div>
          <div className="pe-stat-value">{formatCurrency(resultado.custoFixoTotal)}</div>
          <div className="pe-stat-label">Custo fixo total</div>
        </div>
      </div>

      <div className={`card card-padding pe-highlight ${resultado.inviavel && !resultado.semDespesasFixas ? 'pe-highlight--inviavel' : ''}`}>
        <div className="pe-highlight-icon"><Target size={28} strokeWidth={2} /></div>
        <div className="pe-highlight-info">
          <div className="pe-highlight-label">Ponto de Equilíbrio</div>
          {resultado.semDespesasFixas ? (
            <p className="text-sm text-secondary pe-highlight-sub">
              Nenhuma despesa fixa cadastrada para este período — o cálculo de Ponto de Equilíbrio não é confiável sem elas.{' '}
              <Link to="/despesas-fixas">Cadastrar despesas fixas</Link>
            </p>
          ) : (
            <>
              <div className="pe-highlight-value">
                {resultado.inviavel ? 'Inviável no período' : formatCurrency(resultado.pontoEquilibrio)}
                {!resultado.inviavel && <DeltaIndicador delta={deltas?.pontoEquilibrio} formatar={formatCurrency} />}
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
            </>
          )}
        </div>
      </div>

      <GraficoPontoEquilibrio resultado={resultado} />
    </>
  );
}
