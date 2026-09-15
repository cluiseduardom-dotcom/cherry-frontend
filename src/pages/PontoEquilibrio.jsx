import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calcularPontoEquilibrio } from '../services/pontoEquilibrio';
import PainelPontoEquilibrio from '../components/PainelPontoEquilibrio';
import './PontoEquilibrio.css';

const DIA_MS = 24 * 60 * 60 * 1000;

function parseDataISO(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function formatarDataISO(timestampUTC) {
  const data = new Date(timestampUTC);
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function diasEntre(dataInicio, dataFim) {
  return Math.round((parseDataISO(dataFim) - parseDataISO(dataInicio)) / DIA_MS) + 1;
}

// Mesma duração de A, terminando no dia imediatamente anterior ao início de A.
function calcularPeriodoBAutomatico({ dataInicio, dataFim }) {
  const duracaoDias = diasEntre(dataInicio, dataFim);
  const fimBTimestamp = parseDataISO(dataInicio) - DIA_MS;
  const inicioBTimestamp = fimBTimestamp - (duracaoDias - 1) * DIA_MS;
  return {
    dataInicio: formatarDataISO(inicioBTimestamp),
    dataFim: formatarDataISO(fimBTimestamp)
  };
}

// Espelha o default do backend (dia 1 do mês corrente até hoje) para poder
// calcular o período B sem esperar a resposta de A — mesma armadilha de fuso
// já documentada no projeto: getters locais porque envolve "agora".
function periodoAtualPadrao() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const formatarLocal = data => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };
  return { dataInicio: formatarLocal(inicioMes), dataFim: formatarLocal(hoje) };
}

function resolverEfetivoA(paramsA) {
  if (paramsA.dataInicio && paramsA.dataFim) return paramsA;
  return periodoAtualPadrao();
}

async function buscarPeriodo(params) {
  try {
    const data = await calcularPontoEquilibrio(params);
    return { data };
  } catch (err) {
    return { erro: err.message };
  }
}

export default function PontoEquilibrio() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [resultadoA, setResultadoA] = useState(null);
  const [loadingA, setLoadingA] = useState(true);
  const [errorA, setErrorA] = useState('');

  const [comparar, setComparar] = useState(false);
  const [overrideB, setOverrideB] = useState(false);
  const [dataInicioB, setDataInicioB] = useState('');
  const [dataFimB, setDataFimB] = useState('');
  const [resultadoB, setResultadoB] = useState(null);
  const [loadingB, setLoadingB] = useState(false);
  const [errorB, setErrorB] = useState('');

  async function carregarTudo(paramsA) {
    setLoadingA(true);
    setErrorA('');

    let paramsB = null;
    if (comparar) {
      setLoadingB(true);
      setErrorB('');
      paramsB = overrideB && dataInicioB && dataFimB
        ? { dataInicio: dataInicioB, dataFim: dataFimB }
        : calcularPeriodoBAutomatico(resolverEfetivoA(paramsA));
    }

    const [respA, respB] = await Promise.all([
      buscarPeriodo(paramsA),
      paramsB ? buscarPeriodo(paramsB) : Promise.resolve(null)
    ]);

    if (respA.erro) {
      setErrorA(respA.erro);
    } else {
      setResultadoA(respA.data);
      setDataInicio(respA.data.periodo.inicio);
      setDataFim(respA.data.periodo.fim);
    }
    setLoadingA(false);

    if (paramsB) {
      if (!overrideB) {
        setDataInicioB(paramsB.dataInicio);
        setDataFimB(paramsB.dataFim);
      }
      if (respB.erro) setErrorB(respB.erro);
      else setResultadoB(respB.data);
      setLoadingB(false);
    }
  }

  async function buscarEAtualizarB(paramsB, aplicarComoAutomatico) {
    setLoadingB(true);
    setErrorB('');
    if (aplicarComoAutomatico) {
      setDataInicioB(paramsB.dataInicio);
      setDataFimB(paramsB.dataFim);
    }
    const resp = await buscarPeriodo(paramsB);
    if (resp.erro) setErrorB(resp.erro);
    else setResultadoB(resp.data);
    setLoadingB(false);
  }

  useEffect(() => {
    carregarTudo({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAplicarPeriodo(e) {
    e.preventDefault();
    carregarTudo({ dataInicio, dataFim });
  }

  function handleMesAtual() {
    carregarTudo({});
  }

  function handleToggleComparar(e) {
    const ligar = e.target.checked;
    setComparar(ligar);
    if (ligar && dataInicio && dataFim) {
      const paramsB = overrideB && dataInicioB && dataFimB
        ? { dataInicio: dataInicioB, dataFim: dataFimB }
        : calcularPeriodoBAutomatico({ dataInicio, dataFim });
      buscarEAtualizarB(paramsB, !overrideB);
    }
  }

  function handleAplicarPeriodoB(e) {
    e.preventDefault();
    setOverrideB(true);
    buscarEAtualizarB({ dataInicio: dataInicioB, dataFim: dataFimB }, false);
  }

  function handleUsarAutomaticoB() {
    setOverrideB(false);
    buscarEAtualizarB(calcularPeriodoBAutomatico({ dataInicio, dataFim }), true);
  }

  const duracaoA = resultadoA ? diasEntre(resultadoA.periodo.inicio, resultadoA.periodo.fim) : null;
  const duracaoB = resultadoB ? diasEntre(resultadoB.periodo.inicio, resultadoB.periodo.fim) : null;
  const duracaoDiferente = comparar && duracaoA != null && duracaoB != null && duracaoA !== duracaoB;

  const deltas = (comparar && resultadoA && resultadoB && !errorA && !errorB) ? {
    receita: { atual: resultadoA.receita, anterior: resultadoB.receita, maiorEMelhor: true },
    margemContribuicao: { atual: resultadoA.margemContribuicao, anterior: resultadoB.margemContribuicao, maiorEMelhor: true },
    pontoEquilibrio: (resultadoA.pontoEquilibrio != null && resultadoB.pontoEquilibrio != null)
      ? { atual: resultadoA.pontoEquilibrio, anterior: resultadoB.pontoEquilibrio, maiorEMelhor: false }
      : null
  } : null;

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

      <label className="pe-comparar-toggle">
        <input type="checkbox" checked={comparar} onChange={handleToggleComparar} />
        Comparar com outro período
      </label>

      {comparar && (
        <form className="pe-periodo-b-form" onSubmit={handleAplicarPeriodoB}>
          <div className="input-wrapper">
            <label className="input-label" htmlFor="pe-inicio-b">Período B · De</label>
            <input
              id="pe-inicio-b"
              type="date"
              className="input-field"
              value={dataInicioB}
              onChange={e => setDataInicioB(e.target.value)}
            />
          </div>
          <div className="input-wrapper">
            <label className="input-label" htmlFor="pe-fim-b">Até</label>
            <input
              id="pe-fim-b"
              type="date"
              className="input-field"
              value={dataFimB}
              onChange={e => setDataFimB(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">Aplicar período B</button>
          {overrideB && (
            <button type="button" className="btn btn-ghost" onClick={handleUsarAutomaticoB}>
              Usar automático
            </button>
          )}
          <span className="pe-periodo-b-form-hint">
            {overrideB
              ? 'Período B definido manualmente.'
              : 'Automático: mesma duração do período A, imediatamente anterior.'}
          </span>
        </form>
      )}

      {duracaoDiferente && (
        <p className="text-sm text-secondary pe-duracao-aviso">
          Período B tem duração diferente do período A ({duracaoB} dias vs. {duracaoA} dias) — as variações percentuais continuam válidas, mas comparar os valores diretamente pode enganar.
        </p>
      )}

      {!comparar && (
        <PainelPontoEquilibrio resultado={resultadoA} loading={loadingA} error={errorA} permitirSimulacao />
      )}

      {comparar && (
        <div className="pe-comparacao-grid">
          <div>
            <div className="pe-periodo-coluna-titulo">
              Período A · {formatarDataBR(dataInicio)} – {formatarDataBR(dataFim)}
            </div>
            <PainelPontoEquilibrio resultado={resultadoA} loading={loadingA} error={errorA} deltas={deltas} />
          </div>
          <div>
            <div className="pe-periodo-coluna-titulo">
              Período B · {formatarDataBR(dataInicioB)} – {formatarDataBR(dataFimB)}
            </div>
            <PainelPontoEquilibrio resultado={resultadoB} loading={loadingB} error={errorB} />
          </div>
        </div>
      )}
    </div>
  );
}
