// Regras do bloco "Condições de venda" (sem React). O backend valida de novo; aqui só se avisa antes de enviar.
import { CAMPOS_CONDICOES } from '../services/lojaCondicoes';

export const LIMITES_CONDICOES = { garantia_texto: 300, embalagem_presente_texto: 200 };
export const VALOR_MAXIMO_FRETE_GRATIS = 100000;

/** Lê o valor digitado ("300", "299,90", ""): vazio = null (sem frete grátis); inválido = NaN. */
export function lerValorFrete(texto) {
  const t = String(texto ?? '').trim();

  if (t === '') return null;

  const numero = Number(t.replace(/\./g, '').replace(',', '.'));

  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : NaN;
}

/** Formulário a partir do que o backend devolveu: o valor vira texto com vírgula; textos nulos viram vazio. */
export function formDasCondicoes(dados) {
  const valor = dados?.frete_gratis_acima;

  return {
    frete_gratis_acima: typeof valor === 'number' ? String(valor).replace('.', ',') : '',
    garantia_texto: dados?.garantia_texto ?? '',
    embalagem_presente_texto: dados?.embalagem_presente_texto ?? '',
  };
}

/** Corpo do PUT: valor numérico ou null; textos aparados (vazio vira null). */
export function montarCorpoCondicoes(form) {
  const corpo = { frete_gratis_acima: lerValorFrete(form.frete_gratis_acima) };

  for (const campo of CAMPOS_CONDICOES.filter((c) => c !== 'frete_gratis_acima')) corpo[campo] = String(form[campo] ?? '').trim() || null;

  return corpo;
}

/** Primeiro problema encontrado, ou null. */
export function validarCondicoes(form) {
  const valor = lerValorFrete(form.frete_gratis_acima);

  if (Number.isNaN(valor) || (valor !== null && (valor <= 0 || valor > VALOR_MAXIMO_FRETE_GRATIS))) {
    return 'Informe o valor do frete grátis em reais, maior que zero (ex.: 300 ou 299,90), ou deixe em branco para não oferecer.';
  }

  for (const [campo, limite] of Object.entries(LIMITES_CONDICOES)) {
    if (String(form[campo] ?? '').trim().length > limite) return `Este texto deve ter no máximo ${limite} caracteres.`;
  }

  return null;
}
