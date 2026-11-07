// Fórmulas do Dashboard, espelhando o backend (src/repositories/dashboardRepository.js).
// Só para a tela "Como os cálculos funcionam": o Dashboard continua usando os números do backend.

export const PERIODO_PADRAO_DIAS = 90;
export const LIMITE_CURVA_A = 80;
export const LIMITE_CURVA_B = 95;

function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

// Giro = vendido no período / estoque atual. Nulo quando o estoque é 0.
export function calcularGiro(vendido, estoque) {
  if (!Number.isFinite(vendido) || !Number.isFinite(estoque) || estoque <= 0) return null;
  return arredondar(vendido / estoque, 2);
}

// Cobertura (dias) = estoque / (vendido / dias). Nula quando nada foi vendido.
export function calcularCobertura(vendido, estoque, dias) {
  if (!Number.isFinite(vendido) || !Number.isFinite(estoque) || !Number.isFinite(dias) || vendido <= 0 || dias <= 0) return null;
  return arredondar(estoque / (vendido / dias), 1);
}

// Classe da Curva ABC pelo percentual acumulado (0–100) do produto, já incluindo o próprio faturamento.
export function classificarCurva(percentualAcumulado, faturamentoTotal) {
  if (!(faturamentoTotal > 0)) return 'C';
  if (percentualAcumulado <= LIMITE_CURVA_A) return 'A';
  if (percentualAcumulado <= LIMITE_CURVA_B) return 'B';
  return 'C';
}

// Exemplo didático: faturamentos em ordem decrescente -> acumulado e classe de cada um.
export function simularCurvaAbc(faturamentos) {
  const total = faturamentos.reduce((s, v) => s + v, 0);
  let acumulado = 0;
  return faturamentos.map((faturamento, i) => {
    acumulado += faturamento;
    const percentual = total > 0 ? arredondar((acumulado / total) * 100, 2) : 0;
    return { posicao: i + 1, faturamento, percentual, curva: classificarCurva(acumulado / total * 100, total) };
  });
}

// Cards "Giro médio" e "Cobertura média": vêm de `totais` do resumo (soma/soma, calculado no backend).
// Ausente/nulo (backend antigo, sem venda no período) vira null = "—" na tela.
export function indicadoresDeTotais(totais) {
  const giro = totais?.giro;
  const cobertura = totais?.cobertura;
  const valido = v => v !== null && v !== undefined && Number.isFinite(Number(v));

  return {
    giroMedio: valido(giro) ? Number(giro).toFixed(2) : null,
    coberturaMedia: valido(cobertura) ? Math.round(Number(cobertura)) : null,
  };
}
