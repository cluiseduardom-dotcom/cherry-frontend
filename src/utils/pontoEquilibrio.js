function arredondar(valor, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

// Mesma regra do backend (cherry-backend/src/services/pontoEquilibrioService.js):
// margem <= 0 (ou não numérica) é inviável, e nesse caso pontoEquilibrio e
// faltaParaAtingir voltam null em vez de Infinity/NaN — não existe "quanto
// falta" bem definido quando a receita não cobre nem o custo variável.
export function calcularResultado({ receita, custoFixoTotal, margemContribuicao }) {
  const margem = Number(margemContribuicao);
  const custo = Number(custoFixoTotal);
  const rec = Number(receita);

  const inviavel = !(Number.isFinite(margem) && margem > 0) || !Number.isFinite(custo);
  if (inviavel) {
    return { pontoEquilibrio: null, inviavel: true, faltaParaAtingir: null };
  }

  const pontoEquilibrio = arredondar(custo / margem);
  const faltaParaAtingir = arredondar(Math.max(0, pontoEquilibrio - (Number.isFinite(rec) ? rec : 0)));

  return { pontoEquilibrio, inviavel: false, faltaParaAtingir };
}
