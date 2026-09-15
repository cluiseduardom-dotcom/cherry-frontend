import { useState } from 'react';
import { TrendingUp, PiggyBank, Wallet, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import GraficoPontoEquilibrio from './GraficoPontoEquilibrio';
import SimulacaoPontoEquilibrio from './SimulacaoPontoEquilibrio';
import { calcularResultado } from '../utils/pontoEquilibrio';
import './PainelPontoEquilibrio.css';

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(2)}%`;
}

// Campo vazio ou não numérico cai no valor real (nunca propaga NaN pro cálculo).
function paraNumeroOuNulo(valorStr) {
  if (valorStr === '' || valorStr == null) return null;
  const n = Number(valorStr);
  return Number.isFinite(n) ? n : null;
}

function arredondarPercentual(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function DeltaIndicador({ delta, formatar, rotuloAnterior = 'Período B' }) {
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
    <span className={`pe-delta ${classeCor}`} title={`${rotuloAnterior}: ${formatar(anterior)}`}>
      {seta} {texto}
    </span>
  );
}

export default function PainelPontoEquilibrio({ resultado, loading, error, deltas, permitirSimulacao = false }) {
  const [simulando, setSimulando] = useState(false);
  const [custoFixoSim, setCustoFixoSim] = useState('');
  const [margemSim, setMargemSim] = useState('');
  const [receitaSim, setReceitaSim] = useState('');

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

  function prefilarComValoresReais() {
    setCustoFixoSim(String(resultado.custoFixoTotal ?? 0));
    setMargemSim(String(arredondarPercentual((resultado.margemContribuicao ?? 0) * 100)));
    setReceitaSim(String(resultado.receita ?? 0));
  }

  function handleAtivarSimulacao() {
    prefilarComValoresReais();
    setSimulando(true);
  }

  function handleDesativarSimulacao() {
    setSimulando(false);
  }

  const custoFixoNum = paraNumeroOuNulo(custoFixoSim);
  const margemPercNum = paraNumeroOuNulo(margemSim);
  const receitaNum = paraNumeroOuNulo(receitaSim);

  const custoFixoEfetivo = custoFixoNum ?? (resultado.custoFixoTotal ?? 0);
  const margemEfetiva = margemPercNum != null ? margemPercNum / 100 : (resultado.margemContribuicao ?? 0);
  const receitaEfetiva = receitaNum ?? (resultado.receita ?? 0);

  const resultadoSimulado = simulando ? {
    ...resultado,
    custoFixoTotal: custoFixoEfetivo,
    margemContribuicao: margemEfetiva,
    receita: receitaEfetiva,
    semDespesasFixas: false,
    ...calcularResultado({ receita: receitaEfetiva, custoFixoTotal: custoFixoEfetivo, margemContribuicao: margemEfetiva })
  } : null;

  const resultadoExibido = resultadoSimulado ?? resultado;

  const deltasEfetivos = simulando ? {
    receita: { atual: resultadoExibido.receita, anterior: resultado.receita, maiorEMelhor: true },
    margemContribuicao: { atual: resultadoExibido.margemContribuicao, anterior: resultado.margemContribuicao, maiorEMelhor: true },
    custoFixoTotal: { atual: resultadoExibido.custoFixoTotal, anterior: resultado.custoFixoTotal, maiorEMelhor: false },
    pontoEquilibrio: (resultadoExibido.pontoEquilibrio != null && resultado.pontoEquilibrio != null)
      ? { atual: resultadoExibido.pontoEquilibrio, anterior: resultado.pontoEquilibrio, maiorEMelhor: false }
      : null
  } : deltas;

  const rotuloAnteriorDelta = simulando ? 'Valor real' : 'Período B';

  const metaBatida = !resultadoExibido.semDespesasFixas && !resultadoExibido.inviavel
    && resultadoExibido.faltaParaAtingir === 0 && resultadoExibido.receita > 0;

  return (
    <>
      {permitirSimulacao && (
        <SimulacaoPontoEquilibrio
          ativo={simulando}
          custoFixo={custoFixoSim}
          margem={margemSim}
          receita={receitaSim}
          onChangeCustoFixo={setCustoFixoSim}
          onChangeMargem={setMargemSim}
          onChangeReceita={setReceitaSim}
          onAtivar={handleAtivarSimulacao}
          onDesativar={handleDesativarSimulacao}
          onRestaurar={prefilarComValoresReais}
        />
      )}

      <div className="pe-stats-grid">
        <div className="card card-padding pe-stat-card">
          <div className="pe-stat-icon"><TrendingUp size={18} strokeWidth={2} /></div>
          <div className="pe-stat-value">{formatCurrency(resultadoExibido.receita)}</div>
          <div className="pe-stat-label">Receita do período</div>
          <DeltaIndicador delta={deltasEfetivos?.receita} formatar={formatCurrency} rotuloAnterior={rotuloAnteriorDelta} />
        </div>

        <div className="card card-padding pe-stat-card">
          <div className="pe-stat-icon"><PiggyBank size={18} strokeWidth={2} /></div>
          <div className="pe-stat-value">{formatPercent(resultadoExibido.margemContribuicao)}</div>
          <div className="pe-stat-label">Margem de contribuição</div>
          <DeltaIndicador delta={deltasEfetivos?.margemContribuicao} formatar={formatPercent} rotuloAnterior={rotuloAnteriorDelta} />
        </div>

        <div className="card card-padding pe-stat-card">
          <div className="pe-stat-icon"><Wallet size={18} strokeWidth={2} /></div>
          <div className="pe-stat-value">{formatCurrency(resultadoExibido.custoFixoTotal)}</div>
          <div className="pe-stat-label">Custo fixo total</div>
          <DeltaIndicador delta={deltasEfetivos?.custoFixoTotal} formatar={formatCurrency} rotuloAnterior={rotuloAnteriorDelta} />
        </div>
      </div>

      <div className={`card card-padding pe-highlight ${resultadoExibido.inviavel && !resultadoExibido.semDespesasFixas ? 'pe-highlight--inviavel' : ''} ${simulando ? 'pe-highlight--simulando' : ''}`}>
        <div className="pe-highlight-icon"><Target size={28} strokeWidth={2} /></div>
        <div className="pe-highlight-info">
          <div className="pe-highlight-label">
            Ponto de Equilíbrio
            {simulando && <span className="badge badge-warning pe-highlight-badge">Simulado</span>}
          </div>
          {resultadoExibido.semDespesasFixas ? (
            <p className="text-sm text-secondary pe-highlight-sub">
              Nenhuma despesa fixa cadastrada para este período — o cálculo de Ponto de Equilíbrio não é confiável sem elas.{' '}
              <Link to="/despesas-fixas">Cadastrar despesas fixas</Link>
            </p>
          ) : (
            <>
              <div className="pe-highlight-value">
                {resultadoExibido.inviavel ? `Inviável no ${simulando ? 'cenário' : 'período'}` : formatCurrency(resultadoExibido.pontoEquilibrio)}
                {!resultadoExibido.inviavel && <DeltaIndicador delta={deltasEfetivos?.pontoEquilibrio} formatar={formatCurrency} rotuloAnterior={rotuloAnteriorDelta} />}
              </div>
              {resultadoExibido.inviavel ? (
                <p className="text-sm text-secondary pe-highlight-sub">
                  A margem de contribuição está zerada ou negativa: o custo variável (produtos + impostos) supera a receita {simulando ? 'no cenário simulado' : 'do período'}.
                </p>
              ) : metaBatida ? (
                <p className="pe-highlight-sub pe-highlight-sub--success">Meta batida ✅</p>
              ) : (
                <p className="text-sm text-secondary pe-highlight-sub">
                  Falta {formatCurrency(resultadoExibido.faltaParaAtingir)} para bater o ponto de equilíbrio {simulando ? 'no cenário simulado' : 'no período'}.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <GraficoPontoEquilibrio resultado={resultadoExibido} simulado={simulando} />
    </>
  );
}
